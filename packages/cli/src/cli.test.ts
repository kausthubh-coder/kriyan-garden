import { describe, expect, test } from "bun:test";
import { parseArguments } from "./args";
import { formatDate, formatTasks, formatWeek, matchTask } from "./format";
import { CliError } from "./errors";
import { ApiClient } from "./client";
import { callbackHandler, exchange, pkce, safeUrl, type Http } from "./auth";
import type { CredentialStore, Tokens } from "./credentials";
import { run } from "./run";
import { createHash } from "node:crypto";

const task = { id: "abcdefgh12345678", title: "Read chapter", areaId: "school", status: "active", date: "2026-09-29", time: "15:00", durationMinutes: null };
const areas = [{ id: "school", name: "School" }, { id: "business", name: "Business" }];
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fakeStore = (initial: Tokens | null = { accessToken: "test-access", refreshToken: "test-refresh", clientId: "public-client" }) => {
  let saved = initial;
  const store: CredentialStore = { read: async () => saved, save: async (tokens) => { saved = tokens; return "keychain"; }, clear: async () => { saved = null; return { keychainAvailable: true }; } };
  return store;
};
const context = { today: "2026-09-29", timezone: "America/New_York" };
const config = { clientId: "public-client", authorizationEndpoint: "https://clerk.example/oauth/authorize", tokenEndpoint: "https://clerk.example/oauth/token", scopes: ["tasks:read", "tasks:write", "offline_access"] };
function harness(http: Http, store = fakeStore()) {
  const stdout: string[] = [], stderr: string[] = [], opened: string[] = [];
  return { stdout, stderr, opened, invoke: (args: string[]) => run(args, { http, store, env: { KRIYAN_URL: "https://app.example" }, now: () => new Date("2026-09-30T01:00:00Z"), timezone: context.timezone, stdout: (value) => stdout.push(value), stderr: (value) => stderr.push(value), open: async (url) => { opened.push(url); } }) };
}

describe("argument parsing", () => {
  test("accepts flags in either order and inline filter values", () => {
    expect(parseArguments(["--json", "list", "--area=School", "--project", "Math", "--due", "week", "--all"])).toEqual({ command: "list", positional: [], json: true, all: true, area: "School", project: "Math", due: "week" });
  });
  test("keeps quoted task names and unquoted move times", () => {
    expect(parseArguments(["move", "Read chapter", "tomorrow", "3pm"]).positional).toEqual(["Read chapter", "tomorrow", "3pm"]);
  });
  test("supports text beginning with a dash after --", () => {
    expect(parseArguments(["add", "--", "--important"]).positional).toEqual(["--important"]);
  });
  test("rejects missing values, unexpected options, invalid filters and arguments", () => {
    for (const args of [["list", "--area"], ["list", "--due", "month"], ["today", "--all"], ["move", "Read chapter"], ["add", ""], ["day", "today", "extra"], ["list", "--delete"]]) expect(() => parseArguments(args)).toThrow(CliError);
  });
  test("help does not require command arguments", () => { expect(parseArguments(["move", "--help"]).command).toBe("help"); });
});

describe("text matching and formatting", () => {
  test("matches case-insensitive substrings and full or short ids", () => {
    expect(matchTask([task], "CHAP")).toBe(task);
    expect(matchTask([task], task.id)).toBe(task);
    expect(matchTask([task], "abcdefgh")).toBe(task);
  });
  test("ambiguity reports candidates and exit 2 without choosing", () => {
    try { matchTask([task, { ...task, id: "ijklmnop12345678", title: "Read notes" }], "Read"); throw new Error("Expected ambiguity"); }
    catch (error) { expect(error).toBeInstanceOf(CliError); if (error instanceof CliError) { expect(error.exitCode).toBe(2); expect(error.message).toContain("abcdefgh"); expect(error.message).toContain("ijklmnop"); } }
  });
  test("uses stable calendar dates, 24-hour time and words for areas", () => {
    expect(formatDate("2026-09-29")).toBe("Tue 29 Sep");
    expect(formatDate("2026-02-30")).toBe("Unscheduled");
    const output = formatTasks([task], areas);
    expect(output).toContain("School"); expect(output).toContain("15:00"); expect(output).not.toContain("30m");
    expect(output.split("\n")[1]).not.toContain("\u001b");
  });
  test("strips terminal controls from server-provided task titles", () => {
    expect(formatTasks([{ ...task, title: "Read\u001b[31m\nnotes" }], areas)).not.toContain("\u001b");
  });
  test("week shows area words, optional duration and free capacity", () => {
    const output = formatWeek({ days: [{ date: "2026-09-29", plannedMinutesByArea: { school: 60 }, plannedMinutes: 60, freeMinutes: 180 }], deadlines: [{ ...task, deadline: "2026-10-02", timeNeededMinutes: null, timeFreeMinutes: 180 }] }, areas);
    expect(output).toContain("School"); expect(output).toContain("Business"); expect(output).toContain("Not set"); expect(output).toContain("3h");
  });
});

describe("HTTP and authentication", () => {
  test("includes local date and timezone on reads and writes", async () => {
    const calls: { url: URL; init?: RequestInit }[] = [];
    const http: Http = async (url, init) => { calls.push({ url: new URL(url), init }); return response({ ok: true }); };
    const client = new ApiClient("https://app.example", context, fakeStore(), http);
    await client.request("/tasks", "GET", { status: "active" }); await client.request("/tasks/quick-add", "POST", { text: "Read tomorrow" });
    expect(calls[0]?.url.searchParams.get("today")).toBe("2026-09-29");
    expect(calls[0]?.url.searchParams.get("timezone")).toBe(context.timezone);
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ text: "Read tomorrow", ...context });
  });
  test("refreshes once after 401, persists rotated tokens and retries", async () => {
    const store = fakeStore(); const grants: string[] = []; let attempts = 0;
    const http: Http = async (url, init) => {
      if (url.includes("auth-config")) return response(config);
      if (url === config.tokenEndpoint) { grants.push(String(init?.body)); return response({ access_token: "test-rotated", refresh_token: "test-rotated-refresh", token_type: "Bearer" }); }
      attempts++; return attempts === 1 ? response({}, 401) : response({ userId: "user-test" });
    };
    expect(await new ApiClient("https://app.example", context, store, http).request("/me")).toEqual({ userId: "user-test" });
    expect(attempts).toBe(2); expect(grants[0]).toContain("grant_type=refresh_token");
    expect(await store.read()).toEqual({ accessToken: "test-rotated", refreshToken: "test-rotated-refresh", clientId: config.clientId });
  });
  test("API keys bypass saved credentials and never refresh", async () => {
    let calls = 0; const http: Http = async (_url, init) => { calls++; expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-api-key"); return response({}, 401); };
    const store: CredentialStore = { ...fakeStore(), read: async () => { throw new Error("Should not read store"); } };
    await expect(new ApiClient("https://app.example", context, store, http, "test-api-key").request("/me")).rejects.toMatchObject({ exitCode: 3 }); expect(calls).toBe(1);
  });
  test("missing login is exit 3 without HTTP calls", async () => {
    const http: Http = async () => { throw new Error("Unexpected HTTP"); };
    await expect(new ApiClient("https://app.example", context, fakeStore(null), http).request("/me")).rejects.toMatchObject({ exitCode: 3 });
  });
  test("maps structured API errors without exposing unexpected exception details", async () => {
    const app = harness(async () => response({ error: { code: "rate_limited", message: "Too many requests. Try again in one minute." } }, 429));
    expect(await app.invoke(["today", "--json"])).toBe(1); expect(app.stdout[0]).toContain("Too many requests");
    const broken = harness(async () => { throw new Error("test-private-detail"); });
    expect(await broken.invoke(["whoami"])).toBe(1); expect(broken.stderr.join()).not.toContain("test-private-detail");
  });
  test("PKCE uses S256 and fresh random state", () => {
    const proof = pkce(); expect(proof.verifier.length).toBeGreaterThanOrEqual(43);
    expect(proof.challenge).toBe(createHash("sha256").update(proof.verifier).digest("base64url")); expect(pkce().state).not.toBe(proof.state);
  });
  test("token exchange is public and preserves an unrotated refresh token", async () => {
    const http: Http = async (_url, init) => { const fields = new URLSearchParams(String(init?.body)); expect(fields.get("client_id")).toBe(config.clientId); expect(fields.has("client_secret")).toBe(false); expect(init?.redirect).toBe("error"); return response({ access_token: "test-new", token_type: "bearer" }); };
    const previous = { accessToken: "test-old", refreshToken: "test-refresh", clientId: config.clientId };
    expect(await exchange(http, config, { grant_type: "refresh_token", refresh_token: previous.refreshToken }, previous)).toEqual({ ...previous, accessToken: "test-new" });
  });
  test("rejects insecure app endpoints and URL credentials", () => {
    expect(() => safeUrl("http://app.example")).toThrow(CliError); expect(() => safeUrl("https://user:password@app.example")).toThrow(CliError);
    expect(safeUrl("http://127.0.0.1:3000").hostname).toBe("127.0.0.1");
  });
  test("callback checks state and resolves once, after the browser response ends", () => {
    const codes: string[] = [], errors: Error[] = [], order: string[] = [];
    const handler = callbackHandler("test-state", (code) => { order.push("resolved"); codes.push(code); }, (error) => errors.push(error));
    let status = 200;
    const browser = { setHeader: () => {}, writeHead: (value: number) => { status = value; return browser; }, end: (_message: string, callback?: () => void) => { order.push("end"); callback?.(); } };
    handler({ method: "GET", url: "/callback?state=wrong&code=test-code" }, browser);
    expect(status).toBe(400); expect(codes).toHaveLength(0);
    order.length = 0;
    handler({ method: "GET", url: "/callback?state=test-state&code=test-code" }, browser);
    expect(codes).toEqual(["test-code"]); expect(order).toEqual(["end", "resolved"]);
    handler({ method: "GET", url: "/callback?state=test-state&code=another-code" }, browser);
    expect(codes).toHaveLength(1); expect(errors).toHaveLength(0);
  });
  test("callback reports denied login without returning provider details", () => {
    const errors: Error[] = [];
    const handler = callbackHandler("test-state", () => { throw new Error("Unexpected success"); }, (error) => errors.push(error));
    const browser = { setHeader: () => {}, writeHead: () => browser, end: (_message: string, callback?: () => void) => callback?.() };
    handler({ method: "GET", url: "/callback?state=test-state&error=access_denied&error_description=test-private-detail" }, browser);
    expect(errors[0]).toMatchObject({ exitCode: 3 }); expect(errors[0]?.message).not.toContain("test-private-detail");
  });
  test("callback rejects malformed URL, wrong path, method and missing code", () => {
    let calls = 0;
    const handler = callbackHandler("test-state", () => { calls++; }, () => { calls++; });
    const statuses: number[] = [];
    const browser = { setHeader: () => {}, writeHead: (code: number) => { statuses.push(code); return browser; }, end: () => {} };
    for (const request of [{ method: "GET", url: "http://[" }, { method: "POST", url: "/callback?state=test-state&code=test" }, { method: "GET", url: "/?state=test-state&code=test" }, { method: "GET", url: "/callback?state=test-state" }]) handler(request, browser);
    expect(statuses).toEqual([400, 404, 404, 400]); expect(calls).toBe(0);
  });
});

describe("commands with fake HTTP", () => {
  test("quick add is a thin API call with the device's local date", async () => {
    const app = harness(async (url, init) => { expect(new URL(url).pathname).toBe("/api/v1/tasks/quick-add"); expect(JSON.parse(String(init?.body))).toEqual({ text: "Read tomorrow", ...context }); return response({ ok: true, id: task.id, readBack: "Added Read for tomorrow." }); });
    expect(await app.invoke(["add", "Read tomorrow"])).toBe(0); expect(app.stdout).toEqual(["Added Read for tomorrow."]);
  });
  test("ambiguity exits 2 and never writes", async () => {
    let calls = 0;
    const app = harness(async (_url, init) => { calls++; expect(init?.method).toBe("GET"); return response({ tasks: [task, { ...task, id: "ijklmnop12345678" }] }); });
    expect(await app.invoke(["done", "Read", "--json"])).toBe(2); expect(calls).toBe(1); expect(JSON.parse(app.stdout[0] ?? "{}").error.details.candidates).toHaveLength(2);
  });
  test("single-word titles use text filtering before short-id lookup", async () => {
    const app = harness(async (url, init) => {
      if (init?.method === "GET") { expect(new URL(url).searchParams.get("text")).toBe("homework"); return response({ tasks: [{ ...task, title: "Finish homework" }] }); }
      return response({ ok: true, readBack: "Completed Finish homework." });
    });
    expect(await app.invoke(["done", "homework"])).toBe(0);
  });
  test("short ids use a fallback list when no title matches", async () => {
    const app = harness(async (url, init) => {
      if (init?.method === "GET") return response({ tasks: new URL(url).searchParams.has("text") ? [] : [task] });
      expect(new URL(url).pathname).toContain(task.id); return response({ ok: true, readBack: "Completed Read chapter." });
    });
    expect(await app.invoke(["done", "abcdefgh"])).toBe(0);
  });
  test("done and reopen use the correct status and complete flag", async () => {
    for (const command of ["done", "reopen"]) {
      const app = harness(async (url, init) => {
        if (init?.method === "GET") { expect(new URL(url).searchParams.get("status")).toBe(command === "done" ? "active" : "completed"); return response({ tasks: [{ ...task, status: command === "done" ? "active" : "completed" }] }); }
        expect(JSON.parse(String(init?.body)).completed).toBe(command === "done"); return response({ ok: true, id: task.id, readBack: "Updated Read chapter." });
      });
      expect(await app.invoke([command, "Read chapter"])).toBe(0);
    }
  });
  test("move uses the shared parser and sends date and time only", async () => {
    const app = harness(async (_url, init) => {
      if (init?.method === "GET") return response({ tasks: [task] });
      expect(JSON.parse(String(init?.body))).toEqual({ date: "2026-09-30", time: "15:00", ...context }); return response({ ok: true, readBack: "Moved Read chapter to tomorrow at 15:00." });
    });
    expect(await app.invoke(["move", "Read chapter", "tomorrow", "3pm"])).toBe(0);
  });
  test("move rejects unparsed text or duration without writing", async () => {
    for (const when of ["tomorrow lunch", "tomorrow 2h", "tomorrow 3:99pm"]) {
      let writes = 0; const app = harness(async (_url, init) => { if (init?.method !== "GET") writes++; return response({ tasks: [task] }); });
      expect(await app.invoke(["move", "Read chapter", when])).toBe(1); expect(writes).toBe(0);
    }
  });
  test("list forwards filters and all requests every status", async () => {
    const app = harness(async (url) => { const query = new URL(url).searchParams; expect(query.get("area")).toBe("School"); expect(query.get("due")).toBe("overdue"); expect(query.get("status")).toBe("all"); return response({ tasks: [] }); });
    expect(await app.invoke(["list", "--area", "School", "--due", "overdue", "--all", "--json"])).toBe(0);
  });
  test("JSON output avoids extra formatting requests", async () => {
    let calls = 0; const app = harness(async () => { calls++; return response({ date: context.today, timed: [], anytime: [], unscheduled: [], events: [], plannedMinutes: 0, ...context }); });
    expect(await app.invoke(["today", "--json"])).toBe(0); expect(calls).toBe(1); expect(JSON.parse(app.stdout[0] ?? "{}").today).toBe(context.today);
  });
  test("day rejects impossible dates before HTTP", async () => { const app = harness(async () => { throw new Error("Unexpected HTTP"); }); expect(await app.invoke(["day", "2026-02-30"])).toBe(1); });
  test("open and mcp work without authentication", async () => {
    const app = harness(async () => { throw new Error("Unexpected HTTP"); }, fakeStore(null));
    expect(await app.invoke(["open", "--json"])).toBe(0); expect(app.opened).toEqual(["https://app.example"]);
    expect(await app.invoke(["mcp", "--json"])).toBe(0); expect(app.stdout[1]).toContain("https://app.example/mcp");
  });
});
