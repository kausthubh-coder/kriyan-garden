import { authConfig, exchange, safeUrl, type Http } from "./auth";
import type { CredentialStore } from "./credentials";
import { CliError, object } from "./errors";

export interface RequestContext { today: string; timezone: string }
export class ApiClient {
  readonly base: string;
  constructor(base: string, private readonly context: RequestContext, private readonly store: CredentialStore, private readonly http: Http = fetch, private readonly apiKey?: string, private readonly notify: (message: string) => void = () => {}) {
    const url = safeUrl(base);
    if (url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) throw new CliError("KRIYAN_URL must be the app origin, such as https://app.kriyan.app.");
    this.base = url.origin;
  }

  async request(path: string, method = "GET", data: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const tokens = this.apiKey ? null : await this.store.read();
    const authorization = this.apiKey || tokens?.accessToken;
    if (!authorization) throw new CliError("You are not logged in. Run kriyan login or set KRIYAN_API_KEY.", 3);
    const url = new URL(`/api/v1${path}`, this.base);
    const payload = { ...data, ...this.context };
    if (method === "GET") {
      for (const [key, value] of Object.entries(payload)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const send = (token: string) => this.http(url.toString(), {
      method, redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(method !== "GET" ? { "Content-Type": "application/json" } : {}) },
      ...(method !== "GET" ? { body: JSON.stringify(payload) } : {}),
    });
    let response = await send(authorization);
    if (response.status === 401 && !this.apiKey && tokens?.refreshToken) {
      const config = await authConfig(this.http, this.base, this.context);
      if (config.clientId !== tokens.clientId || (tokens.resource !== undefined && tokens.resource !== config.resource)) throw new CliError("The CLI login configuration changed. Run kriyan login again.", 3);
      const refreshed = await exchange(this.http, config, { grant_type: "refresh_token", refresh_token: tokens.refreshToken }, tokens);
      const storage = await this.store.save(refreshed);
      if (storage === "file") this.notify("Your keychain is unavailable. Credentials now use ~/.config/kriyan/credentials.json with mode 600.");
      response = await send(refreshed.accessToken);
    }
    if (response.status === 401) throw new CliError(this.apiKey ? "KRIYAN_API_KEY was rejected. Set a valid API key and try again." : "Your login expired. Run kriyan login again.", 3);
    let result: Record<string, unknown>;
    try { result = object(await response.json()); }
    catch { throw new CliError("Kriyan returned an invalid response. Check KRIYAN_URL and try again."); }
    if (!response.ok) {
      const detail = result.error;
      const message = detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string" ? detail.message : "Kriyan could not complete the request. Try again.";
      throw new CliError(message, 1, detail);
    }
    return result;
  }
}
