import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { CredentialStore, Tokens } from "./credentials";
import { CliError, object } from "./errors";

export type Http = (url: string, init?: RequestInit) => Promise<Response>;
export interface AuthConfig { clientId: string; authorizationEndpoint: string; tokenEndpoint: string; resource: string; scopes: string[] }

export function safeUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new CliError("Kriyan returned an invalid URL. Check KRIYAN_URL and try again."); }
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))) {
    throw new CliError("Use HTTPS for Kriyan and OAuth endpoints. HTTP is only allowed on loopback addresses.");
  }
  return url;
}

export async function authConfig(http: Http, base: string, context: { today: string; timezone: string }): Promise<AuthConfig> {
  const url = new URL("/api/v1/auth-config", base);
  url.search = new URLSearchParams(context).toString();
  const response = await http(url.toString(), { signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!response.ok) throw new CliError("Browser login is not configured on this Kriyan server. Ask its owner to configure the Clerk CLI client.");
  const data = object(await response.json());
  if (typeof data.clientId !== "string" || !data.clientId || typeof data.authorizationEndpoint !== "string" || typeof data.tokenEndpoint !== "string" || typeof data.resource !== "string" || !Array.isArray(data.scopes) || !data.scopes.every((scope: unknown) => typeof scope === "string")) {
    throw new CliError("Browser login configuration is invalid. Ask the server owner to configure the Clerk CLI client.");
  }
  safeUrl(data.authorizationEndpoint);
  safeUrl(data.tokenEndpoint);
  const resource = safeUrl(data.resource);
  if (resource.href !== `${safeUrl(base).origin}/api/v1`) throw new CliError("The login resource does not match KRIYAN_URL. Use the server's configured public origin.");
  return { clientId: data.clientId, authorizationEndpoint: data.authorizationEndpoint, tokenEndpoint: data.tokenEndpoint, resource: resource.href, scopes: data.scopes };
}

export async function exchange(http: Http, config: AuthConfig, fields: Record<string, string>, previous?: Tokens): Promise<Tokens> {
  const response = await http(config.tokenEndpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ ...fields, client_id: config.clientId, resource: config.resource }).toString(),
  });
  if (!response.ok) throw new CliError("Your login could not be renewed. Run kriyan login again.", 3);
  const data = object(await response.json());
  if (typeof data.access_token !== "string" || !data.access_token || (data.token_type !== undefined && String(data.token_type).toLowerCase() !== "bearer")) throw new CliError("Clerk returned an invalid login response. Run kriyan login again.", 3);
  const refreshToken = typeof data.refresh_token === "string" ? data.refresh_token : previous?.refreshToken;
  return { accessToken: data.access_token, clientId: config.clientId, resource: config.resource, ...(refreshToken ? { refreshToken } : {}) };
}

export function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url"), state: randomBytes(32).toString("base64url") };
}
export function authorizationUrl(config: AuthConfig, redirect: string, proof: Pick<ReturnType<typeof pkce>, "state" | "challenge">): URL {
  const authorize = new URL(config.authorizationEndpoint);
  authorize.search = new URLSearchParams({ response_type: "code", client_id: config.clientId, resource: config.resource, redirect_uri: redirect, scope: config.scopes.join(" "), state: proof.state, code_challenge: proof.challenge, code_challenge_method: "S256" }).toString();
  return authorize;
}

interface CallbackRequest { method?: string; url?: string }
interface CallbackResponse {
  setHeader(name: string, value: string): unknown;
  writeHead(status: number): CallbackResponse;
  end(message: string, callback?: () => void): unknown;
}

export function callbackHandler(state: string, resolve: (code: string) => void, reject: (error: Error) => void) {
  let received = false;
  return (request: CallbackRequest, response: CallbackResponse) => {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    let callback: URL;
    try { callback = new URL(request.url ?? "/", "http://127.0.0.1"); }
    catch { response.writeHead(400).end("Invalid callback URL. Return to the terminal and try again."); return; }
    if (request.method !== "GET" || callback.pathname !== "/callback") { response.writeHead(404).end("Not found."); return; }
    if (received || callback.searchParams.get("state") !== state) { response.writeHead(400).end("Invalid login state. Return to the terminal and try again."); return; }
    if (callback.searchParams.has("error")) {
      received = true;
      response.writeHead(400);
      response.end("Login was denied. Return to the terminal and run kriyan login again.", () => reject(new CliError("Login was denied. Run kriyan login again.", 3)));
      return;
    }
    const code = callback.searchParams.get("code");
    if (!code) { response.writeHead(400).end("The login code is missing. Try signing in again."); return; }
    received = true;
    response.end("Login received. Return to the terminal to finish signing in.", () => resolve(code));
  };
}

export async function login(options: {
  http: Http; base: string; context: { today: string; timezone: string }; store: CredentialStore;
  open: (url: string) => Promise<void>; notify: (message: string) => void; timeoutMs?: number;
}): Promise<{ ok: true; storage: "keychain" | "file" }> {
  const config = await authConfig(options.http, options.base, options.context);
  const proof = pkce();
  let resolveCode: (code: string) => void = () => {};
  let rejectCode: (error: Error) => void = () => {};
  const codePromise = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  // An opening failure or timeout can reject before the exchange awaits this promise.
  void codePromise.catch(() => {});
  const server = createServer(callbackHandler(proof.state, (code) => resolveCode(code), (error) => rejectCode(error)));
  server.on("error", () => rejectCode(new CliError("Could not start the login callback. Run kriyan login again.")));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new CliError("Could not start the login callback. Run kriyan login again.");
    const redirect = `http://127.0.0.1:${address.port}/callback`;
    const authorize = authorizationUrl(config, redirect, proof);
    timeout = setTimeout(() => rejectCode(new CliError("Login timed out. Run kriyan login again.", 3)), options.timeoutMs ?? 180_000);
    options.notify("Opening your browser to sign in.");
    try { await options.open(authorize.toString()); }
    catch { options.notify(`Open this URL to sign in: ${authorize.toString()}`); }
    const code = await codePromise;
    const tokens = await exchange(options.http, config, { grant_type: "authorization_code", code, code_verifier: proof.verifier, redirect_uri: redirect });
    return { ok: true, storage: await options.store.save(tokens) };
  } finally {
    if (timeout) clearTimeout(timeout);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
