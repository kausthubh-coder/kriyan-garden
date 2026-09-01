# Kriyan

Kriyan is an open-source personal task garden. It keeps one task model across a spatial Garden, a date-derived Distance view, and a Calendar. Tasks support user-created color-coded spaces, due dates, durations, advanced recurrence, multiple reminders, and a Notion-like writing surface with slash commands.

The hosted app uses Clerk for identity, Convex for isolated realtime data, Next.js for the web product, and a Clerk OAuth-protected MCP endpoint for AI clients.

## Stack

- Next.js 16 and React 19
- Clerk development-mode authentication with Google OAuth
- Convex schema, queries, mutations, search, and user isolation
- Streamable HTTP MCP at `/mcp`
- Bun for installation and development

## Local development

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and add Clerk development keys.
3. Run `bunx convex dev` to link and push the backend.
4. In another PowerShell terminal, run:

   ```powershell
   $env:MCP_SERVICE_SECRET = (bunx convex env get MCP_SERVICE_SECRET)
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Required configuration

Clerk needs a JWT template named `convex` with `aud` set to `convex`. Convex needs `CLERK_JWT_ISSUER_DOMAIN` and a random `MCP_SERVICE_SECRET`. The same MCP secret must be present only in the Next.js server environment and Convex; never expose it with a `NEXT_PUBLIC_` prefix.

```bash
bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-issuer.example
bunx convex env set MCP_SERVICE_SECRET your-random-secret
```

## MCP

Connect an OAuth-capable MCP client to `https://www.kriyan.app/mcp`.

`https://kriyan.app/mcp` also works and redirects to the canonical `www` host.

The server advertises OAuth metadata under `/.well-known/`, authenticates through Clerk, and exposes these user-scoped tools:

- `list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`
- `list_spaces`, `create_space`
- `search_notes`

MCP is the primary automation surface because agents get typed, discoverable tools plus per-user OAuth. A separate CLI can later be a thin MCP client rather than a second backend API.

## Verification

```bash
bunx tsc --noEmit
bun run lint
bun run build
```

## License

MIT
