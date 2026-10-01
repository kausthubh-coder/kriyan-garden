# Kriyan CLI

Tasks and goals across School, Business and Life, from your terminal. The CLI calls the same `/api/v1` operations as Kriyan's MCP server.

## Install

Requires Node.js 22.18 or later. After the owner publishes the package:

```sh
npm install --global kriyan
npx kriyan --help
bunx kriyan --help
```

The npm registry returned 404 for `kriyan` on 29 September 2026, so this package uses that name. Availability must be checked again before the first publish.

For local development, run `bun install` at the repository root, then `bun run build` in `packages/cli`. Run the result with `node dist/kriyan.js --help`.

## Sign in

```sh
kriyan login
kriyan whoami
kriyan logout
```

Login opens the browser and uses an OAuth authorization code with S256 PKCE. It listens only on `127.0.0.1`, with a port chosen by the OS, and checks a random callback state. Authorization and token endpoints, the client id and scopes come from `/api/v1/auth-config`.

Auth-config also supplies the exact REST `resource`, normally `https://app.kriyan.app/api/v1`. The CLI requires it to match `KRIYAN_URL` plus `/api/v1`, sends it in authorization, code exchange and refresh, and saves the resource with its credentials. Refresh refuses to switch an already bound credential to a different resource. Existing credentials without an audience may require a new login. Clerk must enable resource-derived audience claims. REST validates this audience independently of the MCP endpoint's `/mcp` audience.

Access and refresh tokens go into the OS keychain under service `kriyan`, separated by the Kriyan server's origin. If the keychain is unavailable, the CLI writes `~/.config/kriyan/credentials.json` with mode 600 in a mode-700 directory and tells you. On Windows, the CLI also removes inherited directory permissions and grants the current user an NTFS ACL before writing credentials. Linux requires a persistent Secret Service keychain; an unavailable service uses the file fallback.

A missing access token or 401 response triggers one refresh and retries the request once. Logout attempts to remove credentials from both the keychain and the file. If the keychain is unavailable, it reports that keychain removal could not be checked. Logout does not revoke tokens at Clerk.

Browser login and silent refresh are the only authentication path. Set `KRIYAN_URL` to a different app origin for self-hosting. The default is `https://app.kriyan.app`; plain HTTP is accepted only for loopback development servers. For scripts, sign in first and add `--json` to commands.

```sh
export KRIYAN_URL=http://localhost:3005
kriyan login
kriyan today --json
```

Every API request sends the device's local calendar date as `today` and its IANA timezone as `timezone`. The CLI never derives today from the server's UTC date.

## Commands

Every command accepts `--json`, including login, logout, open, mcp and help. JSON commands write one result to stdout. Login prompts and storage notices go to stderr.

| Command | What it does |
| --- | --- |
| `kriyan login` | Sign in through your browser. |
| `kriyan logout` | Clear saved credentials for the configured server. |
| `kriyan whoami` | Show your account, local date and timezone. |
| `kriyan add "essay fri 5pm #econ 2h"` | Add a task through shared quick add. Task length is optional. |
| `kriyan today` | Show today's timed tasks, any-time tasks, events, unscheduled tasks and capacity. |
| `kriyan day 2026-09-29` | Show the plan for a calendar date. |
| `kriyan week` | Show this week's load by area and deadlines in the next 14 days. |
| `kriyan list` | List up to 100 active tasks. |
| `kriyan list --area School --project Economics --due week` | Filter tasks by area, project and deadline. Due accepts `today`, `week` or `overdue`. |
| `kriyan list --all` | Include completed tasks. |
| `kriyan done "Read chapter"` | Complete a matching active task. |
| `kriyan reopen "Read chapter"` | Reopen a matching completed task. |
| `kriyan move "Read chapter" tomorrow 3pm` | Move the date and time with the shared parser. |
| `kriyan move "Read chapter" later` | Remove the date and time. |
| `kriyan goals` | List goals with progress and target dates. |
| `kriyan open` | Open the configured web app. |
| `kriyan mcp` | Print setup snippets for Claude, Claude Code, ChatGPT, Cursor and VS Code. |
| `kriyan --help` | Show command help. |

For done, reopen and move, pass a full task id, a short id from the list, or a case-insensitive title substring. More than one match prints candidates and exits with code 2 without writing. Reopen searches completed tasks; done and move search active tasks. If a match set reaches the API's 100-task limit, refine the text or use a full id. Move accepts the shared quick-add day grammar, such as `today`, `tomorrow`, `fri` or `later`, with an optional time. It rejects remaining text and duration tokens rather than changing other task fields.

Text output uses aligned columns, dates such as `Tue 29 Sep`, 24-hour times, area names and status words. It never adds a task length.

| Exit code | Meaning |
| --- | --- |
| 0 | The command completed. |
| 1 | The arguments, request or response failed. |
| 2 | The task reference is ambiguous or the candidate limit prevents a safe match. |
| 3 | There is no valid browser login. |

## Clerk setup for the owner

The hosted product uses Clerk development. Kriyan CLI is already configured through the Clerk CLI as a public application with S256 PKCE, consent, the loopback callback and `openid profile email offline_access`. Its client ID comes from the server environment. No dashboard steps remain. Self-hosters can create the same configuration through the Clerk Backend API; see [how Clerk is configured](../../docs/setup/05-development-oauth.md).

This follows [Clerk's CLI authorization guidance](https://clerk.com/blog/adding-clerk-auth-to-your-cli). The native storage adapter follows [the keyring package's documented API](https://github.com/Brooooooklyn/keyring-node). The build uses [tsdown's dependency bundling rules](https://tsdown.dev/options/dependencies) to include `@kriyan/core` in one ESM file while leaving the optional native keyring dependency installable by npm.

See [development OAuth setup](../../docs/setup/05-development-oauth.md) for the configuration confirmed through the Clerk CLI. `MCP_PUBLIC_ORIGIN` supplies the public origin for both REST and MCP behind a proxy. Dynamic-client default scopes exclude `offline_access`; the registered CLI requests it explicitly. The server operator configures the OAuth application before browser login.

## Test and release

```sh
bun run typecheck
bun run lint
bun test
bun run build
node dist/kriyan.js --help
```

Tests inject a fake HTTP layer and a fake keychain. They do not use the network or your saved credentials. The credentials tests use temporary directories and check mode 600 on POSIX.

The release workflow publishes only on a `cli-v*` tag. The package version must match the tag. The owner must add the repository's `NPM_TOKEN` Actions secret before releasing. No token or secret belongs in this package.
