# Brief 07: production cutover, hardening, and full audit

Read `AGENTS.md` and `docs/PLAN.md` sections 13 and 15. This brief runs after every other brief has landed on `main`.

## Production configuration (describe what is missing; do not change cloud settings unless the step says so)

1. Confirm with `clerk deploy status` (from `apps/web`) whether a Clerk production instance exists. If not, stop and report: the owner must run `clerk deploy` interactively.
2. If it exists: verify with `clerk config pull --instance prod` that the `convex` JWT template exists with `aud` set to `convex`, that Google sign-in is configured, that the OAuth scopes and consent screen from brief 05 are set, that Client ID Metadata Documents and dynamic client registration are on, that the "Kriyan CLI" public OAuth application exists, and that API keys are enabled. Report every gap with the exact setting.
3. Vercel: production env vars must hold the production Clerk keys and `SERVICE_SECRET`. Report which are missing. Confirm `app.kriyan.app` and `kriyan.app` are attached and verified with `vercel domains inspect`.
4. Convex: report whether a production deployment exists (`bunx convex deploy --dry-run` if available, otherwise the dashboard). It must have `CLERK_JWT_ISSUER_DOMAIN` for the production Clerk instance and `SERVICE_SECRET`.

## Hardening (do these)

- Security headers: keep the existing ones and add a Content Security Policy that allows Clerk, Convex, Google Fonts (or switch to self-hosted font files and drop the Google origins), and nothing else. Report-only first if anything breaks, then enforce.
- Rate limits are applied to `/api/v1` and MCP (brief 05). Add a limit to sign-up-adjacent endpoints if any exist.
- `profiles.resetAll` and account deletion work end to end and are covered by a test.
- Every Convex function has an owner-isolation test; add any that are missing.
- Error tracking: Sentry free tier for web and mobile, with the DSN from env and no PII in events. If the owner has not created a Sentry project, wire it so that a missing DSN disables it cleanly and report the step.
- Dependency audit: `bun audit` clean or each finding explained.

## Audit against the design rules

Run the web app with sample data and check every screen against the design rules in `AGENTS.md` and the prototype. Produce `docs/reports/07-audit.md` with a table: screen, rule, pass or fail, fix applied. Check specifically: contrast of every text style on every surface, focus rings on every control, touch targets on phone width, motion durations and easing in the CSS, no garden wording anywhere (`grep -ri` over `apps`, `packages`, `docs/site`), copy rules (sentence case, verb plus object buttons, no em dashes), and loading, empty and error states on every view.

## Final verification

```
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Then, against the production URL once the owner has completed the Clerk steps: sign up as a new user, complete onboarding, add tasks on web, see them in the Android app, connect Claude to the MCP server and plan a day, run `npx kriyan today`. Report the real results of each.
