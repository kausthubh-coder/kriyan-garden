import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { credentials, windowsSystemCommand, type KeyringEntry } from "./credentials";

const testTokens = { accessToken: "test-access", refreshToken: "test-refresh", clientId: "test-public-client" };
const origin = "https://app.example";
describe("credential storage with fake keychain", () => {
  test("resolves Windows ACL commands independently of PATH", () => {
    for (const name of ["whoami.exe", "icacls.exe"] as const) {
      expect(windowsSystemCommand(name, "C:\\Windows")).toBe(`C:\\Windows\\System32\\${name}`);
      expect(win32.isAbsolute(windowsSystemCommand(name, "C:\\Windows"))).toBe(true);
      expect(windowsSystemCommand(name, "")).toBe(name);
      if (process.platform === "win32" && process.env.SystemRoot)
        expect(win32.isAbsolute(windowsSystemCommand(name))).toBe(true);
    }
  });
  test("uses keychain without writing credentials to disk", async () => {
    const home = await mkdtemp(join(tmpdir(), "kriyan-cli-test-"));
    let password: string | null = null;
    const entry: KeyringEntry = { getPassword: () => password, setPassword: (value) => { password = value; }, deletePassword: () => { password = null; } };
    const store = credentials(origin, home, async () => entry);
    try {
      expect(await store.save(testTokens)).toBe("keychain"); expect(await store.read()).toEqual(testTokens);
      await expect(stat(join(home, ".config", "kriyan", "credentials.json"))).rejects.toMatchObject({ code: "ENOENT" });
      expect(await store.clear()).toEqual({ keychainAvailable: true }); expect(await store.read()).toBeNull();
    } finally { await rm(home, { recursive: true, force: true }); }
  });
  test("falls back to a mode-600 file and clears it on logout", async () => {
    const home = await mkdtemp(join(tmpdir(), "kriyan-cli-test-"));
    const store = credentials(origin, home, async () => { throw new Error("Keychain unavailable"); });
    const file = join(home, ".config", "kriyan", "credentials.json");
    try {
      expect(await store.save(testTokens)).toBe("file"); expect(await store.read()).toEqual(testTokens);
      expect(JSON.parse(await readFile(file, "utf8"))[origin].clientId).toBe(testTokens.clientId);
      if (process.platform !== "win32") expect((await stat(file)).mode & 0o777).toBe(0o600);
      expect(await store.clear()).toEqual({ keychainAvailable: false });
      await expect(stat(file)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(home, { recursive: true, force: true }); }
  });
  test("newer fallback credentials override stale keychain credentials", async () => {
    const home = await mkdtemp(join(tmpdir(), "kriyan-cli-test-"));
    const entry: KeyringEntry = { getPassword: () => JSON.stringify({ ...testTokens, accessToken: "test-stale" }), setPassword: () => { throw new Error("Locked"); }, deletePassword: () => {} };
    const store = credentials(origin, home, async () => entry);
    try { expect(await store.save(testTokens)).toBe("file"); expect(await store.read()).toEqual(testTokens); }
    finally { await rm(home, { recursive: true, force: true }); }
  });
  test("separates server origins and clears both storage locations", async () => {
    const home = await mkdtemp(join(tmpdir(), "kriyan-cli-test-"));
    let available = false, password: string | null = null;
    const entry: KeyringEntry = { getPassword: () => password, setPassword: (value) => { password = value; }, deletePassword: () => { password = null; } };
    const factory = async () => { if (!available) throw new Error("Unavailable"); return entry; };
    const store = credentials(origin, home, factory);
    const other = credentials("https://other.example", home, async () => { throw new Error("Unavailable"); });
    try {
      await store.save(testTokens); await other.save({ ...testTokens, clientId: "other-client" });
      available = true; password = JSON.stringify(testTokens); await store.clear();
      expect(password).toBeNull(); expect(await store.read()).toBeNull(); expect((await other.read())?.clientId).toBe("other-client");
    } finally { await rm(home, { recursive: true, force: true }); }
  });
  test("logout removes a corrupted credential file", async () => {
    const home = await mkdtemp(join(tmpdir(), "kriyan-cli-test-"));
    const directory = join(home, ".config", "kriyan"), file = join(directory, "credentials.json");
    const store = credentials(origin, home, async () => { throw new Error("Unavailable"); });
    try { await mkdir(directory, { recursive: true }); await writeFile(file, "invalid-json"); await store.clear(); await expect(stat(file)).rejects.toMatchObject({ code: "ENOENT" }); }
    finally { await rm(home, { recursive: true, force: true }); }
  });
});
