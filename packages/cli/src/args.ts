import { CliError } from "./errors";

const commands = ["login", "logout", "add", "today", "day", "week", "list", "done", "reopen", "move", "goals", "open", "mcp", "whoami"] as const;
export type Command = (typeof commands)[number] | "help";
export interface Arguments {
  command: Command;
  positional: string[];
  json: boolean;
  all: boolean;
  area?: string;
  project?: string;
  due?: "today" | "week" | "overdue";
}

export function parseArguments(argv: readonly string[]): Arguments {
  const result: Arguments = { command: "help", positional: [], json: false, all: false };
  let commandSet = false;
  let positionalOnly = false;
  let help = false;
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--" && !positionalOnly) { positionalOnly = true; continue; }
    if (!positionalOnly && (token === "--help" || token === "-h")) { help = true; continue; }
    if (!positionalOnly && token === "--json") { result.json = true; continue; }
    if (!positionalOnly && token === "--all") { result.all = true; continue; }
    if (!positionalOnly && token.startsWith("--")) {
      const [flag, inline] = token.split(/=(.*)/s, 2);
      if (!["--area", "--project", "--due"].includes(flag)) throw new CliError(`Unknown option ${flag}. Run kriyan --help.`);
      const value = inline ?? argv[++index];
      if (!value || value.startsWith("--")) throw new CliError(`Give ${flag} a value. Run kriyan --help.`);
      if (flag === "--area") result.area = value;
      if (flag === "--project") result.project = value;
      if (flag === "--due") {
        if (value !== "today" && value !== "week" && value !== "overdue") throw new CliError("Use --due today, week or overdue.");
        result.due = value;
      }
      continue;
    }
    if (!positionalOnly && token.startsWith("-")) throw new CliError(`Unknown option ${token}. Run kriyan --help.`);
    if (!commandSet) {
      if (!(commands as readonly string[]).includes(token) && token !== "help") throw new CliError(`Unknown command ${token}. Run kriyan --help.`);
      result.command = token as Command;
      commandSet = true;
    } else result.positional.push(token);
  }
  if (help) { result.command = "help"; return result; }
  if ((result.area || result.project || result.due || result.all) && result.command !== "list") throw new CliError("Use --area, --project, --due and --all with kriyan list.");
  const count = result.positional.length;
  const minimum = result.command === "move" ? 2 : ["add", "day", "done", "reopen"].includes(result.command) ? 1 : 0;
  const maximum = result.command === "move" ? Infinity : minimum;
  if (count < minimum || count > maximum || result.positional.some((value) => !value.trim())) throw new CliError(`Invalid arguments for ${result.command}. Run kriyan --help.`);
  return result;
}

export const helpText = `Kriyan CLI

Usage: kriyan <command> [--json]

  login                              Sign in through your browser
  logout                             Clear saved credentials
  add "<text>"                       Add a task with quick add
  today                              Show today's plan
  day <YYYY-MM-DD>                    Show a day's plan
  week                               Show this week's load and deadlines
  list [--area <name>] [--project <name>]
       [--due today|week|overdue] [--all]
  done <id or text>                   Complete an active task
  reopen <id or text>                 Reopen a completed task
  move <id or text> <when>            Move an active task, e.g. tomorrow 3pm
  goals                              Show goals
  open                               Open the web app
  mcp                                Print AI client setup snippets
  whoami                             Show the signed-in account

Use quotes around task text or a task name containing spaces.
Every command supports --json. --help shows this help.
KRIYAN_URL defaults to https://app.kriyan.app.
Set KRIYAN_API_KEY for scripts and CI.
`;
