# Kriyan

Kriyan is an open-source planner for tasks and goals across School, Business and Life. The web app uses Clerk for identity, Convex for isolated realtime data, and a Clerk OAuth-protected MCP endpoint for AI clients. Task length is optional.

## Repository layout

```text
apps/web/          Next.js 16 web app, public assets and MCP routes
packages/backend/ Convex schema, functions and shared operations
packages/core/    Pure TypeScript quick-add parser and calendar date helpers
docs/             Implementation plan and approved design prototype
```

The repository uses Bun workspaces with hoisted dependencies. React and React DOM are pinned to 19.2.3. The backend package exports its generated API and data model through `@kriyan/backend/convex/_generated/api` and `@kriyan/backend/convex/_generated/dataModel`.

## Local development

Use Bun 1.3.14. Run these commands from the repository root:

1. Install dependencies with `bun install`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your Clerk and Convex configuration. Environment files remain ignored by Git.
3. Start the backend: `cd packages/backend && bunx convex dev`. The first run links the folder to your Convex project and writes `CONVEX_DEPLOYMENT` to `packages/backend/.env.local`.
4. In another terminal, start the web app with `bun run dev`.

Open [http://localhost:3000](http://localhost:3000). Next.js loads the web app's environment from `apps/web/.env.local`.

## Required configuration

The web app needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, the Clerk server key, and `SERVICE_SECRET`. Clerk needs a JWT template named `convex` with `aud` set to `convex`. The Convex deployment needs `CLERK_JWT_ISSUER_DOMAIN` and the same random `SERVICE_SECRET` used by the web server. Keep the service secret in server environments, without a `NEXT_PUBLIC_` prefix. Set `SERVICE_SECRET` in both Convex and the web environment. `MCP_SERVICE_SECRET` is accepted as a temporary fallback; existing local env files are not changed. The signed envelope is `[timestamp, nonce, ownerId, operation, payload]`, with a five-minute window and replay protection.

To configure your Convex deployment, run the following from `packages/backend` with your own values:

```bash
bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-issuer.example
bunx convex env set SERVICE_SECRET your-random-secret
```

## MCP

Connect an OAuth-capable MCP client to `https://kriyan.vercel.app/mcp`.

`kriyan.app` is the public landing page. Product and automation routes redirect to the app host at `kriyan.vercel.app`.

The server advertises OAuth metadata under `/.well-known/`, authenticates through Clerk, and exposes these user-scoped tools:

- `list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`
- `list_spaces`, `create_space`
- `search_notes`

## Commands and verification

Run from the repository root:

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run build
```

`dev` and `build` run the web workspace. `typecheck` generates Next.js route types and checks all workspaces. `lint` and `test` run each workspace that defines the corresponding script. The web app defines linting; core defines Bun tests for the parser and date helpers, and backend defines Vitest tests using convex-test. To serve a production build, run `bun run --filter @kriyan/web start`.

GitHub Actions runs installation with `--frozen-lockfile`, typechecking, linting, tests and the web build for pull requests and pushes to `main` or `v2`. The CI build uses fake Convex, Clerk publishable-key and MCP secret placeholders. They permit build-time validation without production credentials; use your own configuration to run the app.

## License

MIT
