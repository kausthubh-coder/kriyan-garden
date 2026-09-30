# Contributing to Kriyan

Kriyan is an MIT-licensed planner for School, Business and Life. Read [AGENTS.md](AGENTS.md), [the implementation plan](docs/PLAN.md) and the [approved prototype](docs/design/proposals/prototype/) before changing the product.

## Setup

Use Bun 1.3.14 with the repository's hoisted workspaces. Run `bun install`. Copy `apps/web/.env.example` to `apps/web/.env.local` and configure your own Clerk and Convex projects. See [self-hosting](docs/site/self-hosting.md). Start your own backend from `packages/backend` with `bunx convex dev`, then start the web app from the root with `bun run dev`. The public demo at `/demo` works without a signed-in account and keeps edits in memory.

Do not print or commit secrets. `.env*` stays ignored except `.env.example`. Do not use shared account data or a shared deployment for tests. A public demo check needs no backend writes.

## Briefs and review

Tasks are scoped in `.agents/briefs/`. Work on one brief in an isolated branch or worktree. Do not change unrelated surfaces. Follow the prototype rather than redesigning it. Leave changes uncommitted when a brief asks for supervisor review; do not push, publish, deploy or change cloud configuration without explicit scope. Record real commands, outputs, failures, skipped checks and changed files in `docs/reports/`.

## Product and engineering rules

- Dark theme only, with Schibsted Grotesk weights 400 to 700 and shared tokens from `packages/core`.
- Use plain task, area, project, course, goal, day and week language. Task length is always optional. Mobile work is Android only.
- Colour means an area or a late/over status. Primary controls are neutral. Avoid gradients, glow, glass effects, nested cards, coloured card stripes, uppercase labels and emoji icons.
- Provide keyboard access, 44px touch targets, 4.5:1 text contrast, loading/empty/error states and complete control states. Respect reduced motion; animate transform and opacity only, with no keyboard-triggered animation.
- Use strict TypeScript without `any`, `@ts-ignore` or assertions on genuinely nullable values.
- Check identity before every Convex operation. Use owner indexes and limit access to that identity's rows.
- Keep business logic in backend operations or core. All clients call the shared logic. Today comes from the user's local date or timezone.
- Read bundled Next.js guides in `node_modules/next/dist/docs` before writing framework code. Check current official provider docs when touching authentication.

## Checks

Run from the root and report the actual result:

```sh
bun run docs:quick-add
bun run typecheck
bun run lint
bun run test
bun run build
```

Core uses Bun tests. Backend uses Vitest and convex-test. Public browser tests use `bun run --filter @kriyan/web test:public` with an already running app on port 3004; they never sign in or mutate Convex. The authenticated E2E suite has separate setup and must not run against real account data without permission. Capture and Lighthouse scripts for brief 04 are in `apps/web/scripts/`.

## Reporting issues

Give reproduction steps, expected and observed behavior, version, browser or Android version, and a redacted screenshot if useful. Do not post credentials, private task contents or environment files. Report security issues privately using [SECURITY.md](SECURITY.md). Follow the [code of conduct](CODE_OF_CONDUCT.md).
