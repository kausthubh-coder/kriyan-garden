# CLI

The planned `kriyan` command is a thin client over the shared API. The npm release and login flow are being finalized in brief 05. No docs/cli.md existed in this base checkout, and npm availability has not been verified here.

## Planned commands

```sh
npx kriyan add "essay fri 5pm #econ"
npx kriyan today
```

The release is intended to include browser login, logout, today, week, list, done, move, goals and open commands, with JSON output for scripts. The finalized installation, authentication, secure credential storage and troubleshooting instructions will arrive during integration. Do not assume these commands are available on npm yet.

Read the [quick-add grammar](/docs/quick-add) and [API availability](/docs/api). The CLI will use the same parser and backend operations as the app.
