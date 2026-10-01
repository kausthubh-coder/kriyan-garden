# CLI

Organise tasks and goals in your areas from your terminal. The `kriyan` command uses the shared API, so it sees the same planner as the app and the AI you already use. Run it from a clone with Bun:

## Run from a clone

```sh
bun install
bun run kriyan login
bun run kriyan add "essay fri 5pm #econ 2h"
bun run kriyan today
```

Use `login`, `logout`, `today`, `week`, `list`, `done`, `move`, `goals` and `open`. Add `--json` for scripts. Browser login uses OAuth with PKCE. Credentials stay in the OS keychain, with a user-only file fallback. Run `bun run kriyan --help` for options.

Read the [quick-add grammar](/docs/quick-add) and [API guide](/docs/api). The CLI uses the same parser and backend operations as the app.

## Browser login and refresh

Run `kriyan login` to sign in through Clerk and approve access to your planner. Login uses S256 PKCE and an ephemeral loopback port on `127.0.0.1`. It requests `openid profile email offline_access` for the exact API resource. Commands silently renew the access token when needed. Run `kriyan logout` to clear this server's saved credentials.

The hosted product uses Clerk development, with its 100-user limit and development banner. The public CLI application, PKCE, consent, loopback redirect and audience claims are already configured through the Clerk CLI. No dashboard steps remain.
