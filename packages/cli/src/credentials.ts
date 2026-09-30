import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CliError, object } from "./errors";

export interface Tokens { accessToken: string; refreshToken?: string; clientId: string; resource?: string }
export interface CredentialStore {
  read(): Promise<Tokens | null>;
  save(tokens: Tokens): Promise<"keychain" | "file">;
  clear(): Promise<{ keychainAvailable: boolean }>;
}
export interface KeyringEntry {
  getPassword(): string | null | undefined;
  setPassword(password: string): void;
  deletePassword(): void;
}
type EntryFactory = (account: string) => Promise<KeyringEntry>;

export function parseTokens(value: unknown): Tokens {
  const record = object(value);
  if (typeof record.accessToken !== "string" || !record.accessToken || typeof record.clientId !== "string" || !record.clientId || (record.refreshToken !== undefined && typeof record.refreshToken !== "string") || (record.resource !== undefined && (typeof record.resource !== "string" || !record.resource))) {
    throw new CliError("Saved credentials are invalid. Run kriyan logout, then kriyan login.", 3);
  }
  return { accessToken: record.accessToken, clientId: record.clientId, ...(typeof record.resource === "string" ? { resource: record.resource } : {}), ...(typeof record.refreshToken === "string" ? { refreshToken: record.refreshToken } : {}) };
}

const nativeEntry: EntryFactory = async (account) => {
  const { Entry } = await import("@napi-rs/keyring");
  // A kernel-only Linux keyring loses credentials after reboot.
  return new Entry("kriyan", account, { linux: { store: "secret-service" } });
};

const execute = promisify(execFile);
async function privateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  if (process.platform === "win32") {
    // POSIX mode bits cannot protect Windows credentials. Remove inherited ACLs
    // before creating the temporary file, and grant only the current user's SID.
    const { stdout } = await execute("whoami.exe", ["/user", "/fo", "csv", "/nh"], { windowsHide: true, timeout: 10_000 });
    const sid = stdout.match(/S-1-(?:\d+-)+\d+/)?.[0];
    if (!sid) throw new CliError("Could not protect the credentials directory. Enable your OS keychain and run kriyan login again.");
    await execute("icacls.exe", [directory, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`], { windowsHide: true, timeout: 10_000 });
  }
}

export function credentials(origin: string, home = homedir(), entryFactory: EntryFactory = nativeEntry): CredentialStore {
  const directory = join(home, ".config", "kriyan");
  const file = join(directory, "credentials.json");
  const readFileRecords = async (): Promise<Record<string, unknown>> => {
    try { return object(JSON.parse(await readFile(file, "utf8"))); }
    catch (error) {
      if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") return {};
      throw new CliError("Could not read saved credentials. Run kriyan logout, then kriyan login.", 3);
    }
  };
  const writeFileRecords = async (records: Record<string, unknown>) => {
    if (!Object.keys(records).length) { await rm(file, { force: true }); return; }
    await privateDirectory(directory);
    const temporary = join(directory, `credentials-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(records), { flag: "wx", mode: 0o600 });
      await chmod(temporary, 0o600);
      await rename(temporary, file);
      await chmod(file, 0o600);
    } finally { await rm(temporary, { force: true }); }
  };
  const removeFileCredential = async () => {
    const records = await readFileRecords();
    delete records[origin];
    await writeFileRecords(records);
  };
  return {
    async read() {
      // A failed keychain update may leave an older token there. The newer file wins.
      const saved = (await readFileRecords())[origin];
      if (saved !== undefined) return parseTokens(saved);
      let password: string | null | undefined = null;
      try { password = (await entryFactory(origin)).getPassword(); } catch { /* Use the file when the keychain is unavailable. */ }
      if (password != null) {
        try { return parseTokens(JSON.parse(password)); }
        catch { throw new CliError("Saved credentials are invalid. Run kriyan logout, then kriyan login.", 3); }
      }
      return null;
    },
    async save(tokens) {
      let stored = false;
      try { (await entryFactory(origin)).setPassword(JSON.stringify(tokens)); stored = true; } catch { /* Fall back below. */ }
      if (stored) { await removeFileCredential(); return "keychain"; }
      const records = await readFileRecords();
      records[origin] = tokens;
      await writeFileRecords(records);
      return "file";
    },
    async clear() {
      let keychainAvailable = false;
      try {
        const entry = await entryFactory(origin);
        // A missing entry is already cleared. Do not interpret other errors as success.
        if (entry.getPassword() != null) entry.deletePassword();
        keychainAvailable = true;
      } catch { /* Also clear file credentials. Report the unavailable keychain. */ }
      try { await removeFileCredential(); }
      catch (error) {
        if (error instanceof CliError && error.exitCode === 3) await rm(file, { force: true });
        else throw error;
      }
      return { keychainAvailable };
    },
  };
}
