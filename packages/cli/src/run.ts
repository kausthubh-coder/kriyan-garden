import { localClock, parse, weekStart } from "@kriyan/core";
import { parseArguments, helpText } from "./args";
import { ApiClient } from "./client";
import { login, safeUrl, type Http } from "./auth";
import { credentials, type CredentialStore } from "./credentials";
import { CliError, errorMessage } from "./errors";
import { formatDay, formatGoals, formatTasks, formatWeek, id, isDate, matchTask, plain, rows } from "./format";
import { formatMcp, mcpSetup } from "./mcp";
import { openBrowser } from "./browser";

export interface Dependencies {
  http?: Http;
  store?: CredentialStore;
  now?: () => Date;
  timezone?: string;
  env?: { KRIYAN_URL?: string; KRIYAN_API_KEY?: string };
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
  open?: (url: string) => Promise<void>;
}

export async function run(argv: readonly string[], dependencies: Dependencies = {}): Promise<number> {
  const stdout = dependencies.stdout ?? ((message) => process.stdout.write(`${message}\n`));
  const stderr = dependencies.stderr ?? ((message) => process.stderr.write(`${message}\n`));
  const json = argv.includes("--json");
  try {
    const args = parseArguments(argv);
    if (args.command === "help") { stdout(args.json ? JSON.stringify({ help: helpText }) : helpText); return 0; }
    const env = dependencies.env ?? process.env;
    const base = safeUrl(env.KRIYAN_URL ?? "https://app.kriyan.app").origin;
    const timezone = dependencies.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const context = { today: localClock((dependencies.now ?? (() => new Date()))(), timezone).today, timezone };
    const http = dependencies.http ?? fetch;
    const store = dependencies.store ?? credentials(base);
    const open = dependencies.open ?? openBrowser;
    const client = new ApiClient(env.KRIYAN_URL ?? base, context, store, http, env.KRIYAN_API_KEY, stderr);
    const print = (value: unknown, formatted: string) => stdout(args.json ? JSON.stringify(value, null, 2) : formatted);
    const spaces = async () => rows((await client.request("/spaces")).areas);
    const reference = args.positional[0] ?? "";
    if (args.command === "login") {
      const result = await login({ http, base, context, store, open, notify: stderr });
      print(result, result.storage === "keychain" ? "Signed in. Credentials are stored in your OS keychain." : "Signed in. Credentials are stored in ~/.config/kriyan/credentials.json with mode 600.");
      return 0;
    }
    if (args.command === "logout") {
      const result = await store.clear();
      if (!result.keychainAvailable) stderr("The OS keychain is unavailable. File credentials were cleared; keychain removal could not be checked.");
      print({ ok: true, ...result }, "Cleared saved credentials for this Kriyan server.");
      return 0;
    }
    if (args.command === "open") { await open(base); print({ ok: true, url: base }, `Opened ${base}.`); return 0; }
    if (args.command === "mcp") { print(mcpSetup(base), formatMcp(base)); return 0; }
    if (args.command === "add") {
      const result = await client.request("/tasks/quick-add", "POST", { text: reference });
      print(result, plain(result.readBack)); return 0;
    }
    if (args.command === "today" || args.command === "day") {
      const date = args.command === "today" ? context.today : reference;
      if (!isDate(date)) throw new CliError("Use a real date in YYYY-MM-DD format, such as 2026-09-29.");
      const result = await client.request("/day", "GET", { date });
      print(result, args.json ? "" : formatDay(result, await spaces())); return 0;
    }
    if (args.command === "week") {
      const result = await client.request("/week", "GET", { start: weekStart(context.today) });
      print(result, args.json ? "" : formatWeek(result, await spaces())); return 0;
    }
    if (args.command === "list") {
      const result = await client.request("/tasks", "GET", { area: args.area, project: args.project, due: args.due, status: args.all ? "all" : "active", limit: 100 });
      print(result, args.json ? "" : formatTasks(rows(result.tasks), await spaces())); return 0;
    }
    if (args.command === "goals") {
      const result = await client.request("/goals");
      print(result, args.json ? "" : formatGoals(rows(result.goals), await spaces())); return 0;
    }
    if (args.command === "whoami") {
      const result = await client.request("/me");
      print(result, `Account ${plain(result.userId)}\nTimezone ${plain(result.timezone)}\nToday ${plain(result.today)}`); return 0;
    }
    if (["done", "reopen", "move"].includes(args.command)) {
      let taskId = reference;
      // Full Convex ids can address tasks outside the 100-row list limit.
      if (!/^[a-z0-9]{32}$/.test(reference)) {
        const status = args.command === "reopen" ? "completed" : "active";
        // Narrow names before the server's limit. Only try short ids if no title matches.
        const short = /^[a-z0-9]{8,31}$/.test(reference);
        let result = await client.request("/tasks", "GET", { status, limit: 100, text: reference });
        if (!rows(result.tasks).length && short) result = await client.request("/tasks", "GET", { status, limit: 100 });
        const tasks = rows(result.tasks);
        if (tasks.length >= 100) throw new CliError("There are too many possible matches. Use a full task id or longer task text.", 2);
        taskId = id(matchTask(tasks, reference));
      }
      let result: Record<string, unknown>;
      if (args.command === "move") {
        const when = args.positional.slice(1).join(" ");
        for (const token of when.matchAll(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s|$)/gi)) {
          if (Number(token[1]) < 1 || Number(token[1]) > 12 || Number(token[2] ?? 0) > 59) throw new CliError("Use a valid time, such as 3pm or 15:00.");
        }
        const parsed = parse(when, { today: context.today, defaultDate: null, defaultAreaId: "", areas: [], projects: [] });
        if (parsed.title || parsed.durationMinutes !== null || (parsed.date === null && !/^(later|someday)$/i.test(when.trim())) || (parsed.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.time))) {
          throw new CliError('Use a day and optional time, such as "tomorrow 3pm", or "later".');
        }
        result = await client.request(`/tasks/${encodeURIComponent(taskId)}/move`, "POST", { date: parsed.date, time: parsed.time });
      } else result = await client.request(`/tasks/${encodeURIComponent(taskId)}/complete`, "POST", { completed: args.command === "done" });
      print(result, plain(result.readBack)); return 0;
    }
    throw new CliError("Unknown command. Run kriyan --help.");
  } catch (error) {
    const exitCode = error instanceof CliError ? error.exitCode : 1;
    if (json) stdout(JSON.stringify({ error: { code: exitCode === 2 ? "ambiguous" : exitCode === 3 ? "not_logged_in" : "command_failed", message: errorMessage(error), ...(error instanceof CliError && error.details !== undefined ? { details: error.details } : {}) } }));
    else stderr(errorMessage(error));
    return exitCode;
  }
}
