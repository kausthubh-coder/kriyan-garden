// Run with Bun from this worktree. Credentials stay in process memory.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SCOPES } from "../../apps/web/src/lib/operations/scopes";
import { loadEnvConfig } from "@next/env";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { createHmac, randomUUID } from "node:crypto";
import { canonicalJson } from "../../packages/backend/convex/canonical";

const root = resolve(import.meta.dir, "../..");
const base = "http://localhost:3005";
loadEnvConfig(resolve(root, "apps/web"));
type Json = Record<string, unknown>;
const evidence: Json[] = [];
function clerk(path: string, method = "GET", data?: Json, dry = false): Json {
  const args = ["api", path, "--instance", "dev", "-X", method, ...(data ? ["-d", JSON.stringify(data)] : []), ...(dry ? ["--dry-run"] : [])];
  try {
    const raw = execFileSync("clerk", args, { cwd: resolve(root, "apps/web"), windowsHide: true, stdio: "pipe", encoding: "utf8" });
    return dry ? {} : JSON.parse(raw) as Json;
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? typeof error.stderr === "string" ? error.stderr : Buffer.isBuffer(error.stderr) ? error.stderr.toString("utf8") : "" : "";
    const stdout = error && typeof error === "object" && "stdout" in error ? typeof error.stdout === "string" ? error.stdout : Buffer.isBuffer(error.stdout) ? error.stdout.toString("utf8") : "" : "";
    const diagnostic = stdout + stderr;
    const codes = [...diagnostic.matchAll(/"code"\s*:\s*"([a-z0-9_]+)"/g)].map(match => match[1]);
    const status = diagnostic.match(/\((\d{3})\)/)?.[1];
    let reason = "";
    try { const failure = JSON.parse(stdout) as { error?: { message?: string } }; reason = failure.error?.message?.split("\n")[0] ?? ""; } catch { /* Only structured provider messages are safe to report. */ }
    throw new Error(`Clerk ${method} ${path} failed${status ? ` (${status})` : ""}${codes.length ? `: ${[...new Set(codes)].join(", ")}` : ""}${reason ? `; ${reason.replace(/(?:sk_|pk_|oat_|ak_)[A-Za-z0-9_]+/g, "[redacted]")}` : ""}. No credential output was recorded.`);
  }
}
async function request(label: string, path: string, init?: RequestInit) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = { message: "Non-JSON response", contentType: response.headers.get("content-type") }; }
  const result = { label, status: response.status, body, challenge: response.headers.get("www-authenticate") };
  evidence.push(result);
  console.log(JSON.stringify(result));
  return result;
}
let userId: string | undefined, keyId: string | undefined, sessionId: string | undefined;
try {
  const email = `kriyan-brief05-${crypto.randomUUID()}+clerk_test@example.com`;
  const userBody = { email_address: [email], skip_password_requirement: true };
  clerk("/users", "POST", userBody, true);
  const user = clerk("/users", "POST", userBody);
  if (typeof user.id !== "string" || !user.id.startsWith("user_")) throw new Error("Disposable dev identity could not be created.");
  userId = user.id;
  evidence.push({ label: "Disposable dev identity created", ok: true });
  // IDs alone support cleanup after an interrupted test; this file contains no credentials.
  await mkdir(resolve(root, ".data/brief05"), { recursive: true });
  await writeFile(resolve(root, ".data/brief05/cleanup.json"), JSON.stringify({ userId }));
  const sessionBody = { user_id: userId };
  clerk("/sessions", "POST", sessionBody, true);
  const session = clerk("/sessions", "POST", sessionBody);
  if (typeof session.id !== "string") throw new Error("Disposable session creation failed.");
  sessionId = session.id;
  const sessionToken = clerk(`/sessions/${sessionId}/tokens`, "POST", {});
  if (typeof sessionToken.jwt !== "string") throw new Error("Disposable session token was unavailable.");
  evidence.push({ label: "Real active Clerk session", ok: session.status === "active" });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serviceSecret = process.env.SERVICE_SECRET || process.env.MCP_SERVICE_SECRET;
  if (convexUrl && serviceSecret) {
    const timestamp = Date.now(), nonce = randomUUID();
    const signature = createHmac("sha256", serviceSecret).update(canonicalJson([timestamp, nonce, userId, "planner.context", {}])).digest("hex");
    const convex = new ConvexHttpClient(convexUrl, { logger: false });
    try {
      await convex.action(makeFunctionReference<"action", { ownerId: string; timestamp: number; nonce: string; signature: string }, unknown>("service:plannerContext"), { ownerId: userId, timestamp, nonce, signature });
      evidence.push({ label: "Backend service plannerContext exists", ok: true });
    } catch (error) {
      const missing = error instanceof Error && /Could not find public function/.test(error.message);
      const result = { label: "Backend service precondition", ok: false, missingFunction: missing, message: missing ? "Could not find public function for service:plannerContext. Backend changes have not been deployed." : "Service configuration or deployment could not be verified." };
      evidence.push(result); console.log(JSON.stringify(result));
    }
  }
  await request("API unauthenticated", "/api/v1/me");
  await request("CLI login configuration", "/api/v1/auth-config");
  try {
  const keyBody = { name: "Brief 05 disposable live check", subject: userId, scopes: [...SCOPES], seconds_until_expiration: 600 };
  clerk("/api_keys", "POST", keyBody, true);
  const key = clerk("/api_keys", "POST", keyBody);
  if (typeof key.id !== "string") throw new Error("Disposable API key creation failed.");
  keyId = key.id;
  await writeFile(resolve(root, ".data/brief05/cleanup.json"), JSON.stringify({ userId, sessionId, keyId }));
  const secret = typeof key.secret === "string" ? key.secret : clerk(`/api_keys/${keyId}/secret`).secret;
  if (typeof secret !== "string") throw new Error("Disposable API key secret was unavailable.");
  const headers = { authorization: `Bearer ${secret}` };
  for (const path of ["me", "overview", "day?date=2026-09-29", "tasks", "spaces"]) await request(`API ${path}`, `/api/v1/${path}${path.includes("?") ? "&" : "?"}today=2026-09-29&timezone=America%2FNew_York`, { headers });
  const readKeyBody = { name: "Brief 05 read-only key", subject: userId, scopes: ["tasks:read"], seconds_until_expiration: 600 };
  clerk("/api_keys", "POST", readKeyBody, true);
  const readKey = clerk("/api_keys", "POST", readKeyBody);
  if (typeof readKey.id === "string") {
    try {
      const readSecret = typeof readKey.secret === "string" ? readKey.secret : clerk(`/api_keys/${readKey.id}/secret`).secret;
      if (typeof readSecret === "string") await request("API read-only key cannot write", "/api/v1/tasks", { method: "POST", headers: { authorization: `Bearer ${readSecret}`, "content-type": "application/json" }, body: JSON.stringify({ title: "Must not be stored", today: "2026-09-29", timezone: "America/New_York" }) });
    } finally { clerk(`/api_keys/${readKey.id}`, "DELETE", undefined, true); clerk(`/api_keys/${readKey.id}`, "DELETE"); }
  }
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Clerk ") ? error.message : "Disposable API key was unavailable.";
    evidence.push({ label: "API key integration blocked", message }); console.log(message);
  }
  for (const version of ["2025-11-25", "2026-07-28"]) {
    for (const [method, params] of [
      [version === "2026-07-28" ? "server/discover" : "initialize", version === "2026-07-28" ? {} : { protocolVersion: version, capabilities: {}, clientInfo: { name: "live-disposable", version: "1" } }],
      ["tools/list", {}], ["tools/call", { name: "get_overview", arguments: { today: "2026-09-29", timezone: "America/New_York" } }],
      ["tools/call", { name: "quick_add", arguments: { text: "Brief05 disposable task tomorrow", today: "2026-09-29", timezone: "America/New_York" } }],
      ["tools/call", { name: "complete_task", arguments: { today: "2026-09-29", timezone: "America/New_York" } }],
    ] as const) {
      // A real session token deliberately cannot stand in for an OAuth access token.
      await request(`MCP ${version} ${method}${"name" in params ? ` ${params.name}` : ""}`, "/mcp", { method: "POST", headers: { authorization: `Bearer ${sessionToken.jwt}`, "content-type": "application/json", accept: "application/json, text/event-stream", "MCP-Protocol-Version": version, "Mcp-Method": method, ...("name" in params ? { "Mcp-Name": params.name } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, ...(version === "2026-07-28" ? { _meta: { "io.modelcontextprotocol/protocolVersion": version, "io.modelcontextprotocol/clientCapabilities": {}, "io.modelcontextprotocol/clientInfo": { name: "live-disposable", version: "1" } } } : {}) } }) });
    }
  }
  await request("MCP untrusted Origin", "/mcp", { method: "POST", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: '{}' });
  await request("MCP protected resource metadata", "/.well-known/oauth-protected-resource/mcp");
} catch (error) {
  // Only our static messages are emitted; never a raw CLI/SDK exception.
  const safe = error instanceof Error && /^(Clerk |Disposable )/.test(error.message) ? error.message : "Live checks could not finish. Inspect configuration without logging credentials.";
  evidence.push({ label: "Live check blocker", message: safe }); console.log(safe);
  process.exitCode = 1;
} finally {
  for (const [path, method] of [[keyId ? `/api_keys/${keyId}` : undefined, "DELETE"], [sessionId ? `/sessions/${sessionId}/revoke` : undefined, "POST"], [userId ? `/users/${userId}` : undefined, "DELETE"]] as const) if (path) {
    try { clerk(path, method, undefined, true); clerk(path, method); evidence.push({ label: `Cleanup ${path.split("/")[1]}`, ok: true }); }
    catch { evidence.push({ label: `Cleanup ${path.split("/")[1]}`, ok: false }); process.exitCode = 1; }
  }
  await mkdir(resolve(root, ".data/brief05"), { recursive: true });
  await writeFile(resolve(root, ".data/brief05/live-results.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ cleanup: evidence.filter(item => String(item.label).startsWith("Cleanup")) }));
}
