# CLI

The `kriyan` command is a thin client over the shared API. Run it from a clone with Bun:

## Run from a clone

```sh
bun install
bun run kriyan login
bun run kriyan add "essay fri 5pm #econ 2h"
bun run kriyan today
```

Use `login`, `logout`, `today`, `week`, `list`, `done`, `move`, `goals` and `open`. Add `--json` for scripts. Browser login uses OAuth with PKCE. Credentials stay in the OS keychain, with a user-only file fallback. Run `bun run kriyan --help` for options.

Read the [quick-add grammar](/docs/quick-add) and [API guide](/docs/api). The CLI uses the same parser and backend operations as the app.
