# Self-hosting

Kriyan is MIT licensed. The hosted version is the default, but you can operate your own Clerk, Convex and web deployment. A local setup can take a few hours; configuring identity, OAuth, a production domain, release signing and push delivery can take a day or more.

## Local setup

Install Bun 1.3.14, clone the repository and run these commands from its root:

```sh
bun install
bun run dev
```

Create your own Clerk application and Convex development deployment. Copy `apps/web/.env.example` to `apps/web/.env.local` and supply your own values. In `packages/backend`, run `bunx convex dev` against your own deployment. That command writes development deployment configuration. Do not point a development checkout at someone else's account or shared production database.

## Identity and backend

Clerk is the identity provider. Create a JWT template named `convex` with audience `convex`. Configure the Convex issuer domain to match Clerk. Every operation checks identity and reads or writes only that owner's rows. The MCP and API server verify Clerk credentials and send a signed service request to the backend.

| Variable | Where | Purpose |
| --- | --- | --- |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Web browser and server | Clerk's public application identifier |
| CLERK_SECRET_KEY | Web server only | Clerk server authentication |
| NEXT_PUBLIC_CONVEX_URL | Web browser and server | Your Convex deployment URL |
| CLERK_JWT_ISSUER_DOMAIN | Convex server | Clerk JWT issuer |
| SERVICE_SECRET | Web and Convex servers only | Matching random secret for signed service requests |
| CONVEX_DEPLOYMENT | Local backend tooling | Your development deployment selection |

Never put a secret behind a NEXT_PUBLIC prefix. Never commit an environment file or paste its values into a bug report. MCP_SERVICE_SECRET is a temporary legacy fallback; use SERVICE_SECRET for new setups. See each workspace's .env.example for its current full set of variable names. Briefs 05 and 06 will supply final CLI OAuth and Android configuration.

## Web deployment

Use a Vercel project rooted at `apps/web`, with the workspace install at the repository root. Set environment values in the project, deploy your own Convex production backend, and configure your own Clerk instance through its CLI. The hosted product uses development identity with a 100-user limit and a development banner. The production routing currently assumes `kriyan.app` for marketing and `app.kriyan.app` for the app; change the origin constants and host routing for domains you own. Development uses one localhost origin and port, normally 3000.

Configure Clerk callback URLs, allowed origins, JWT template, standard OAuth scopes, PKCE, resource audience claims and consent for your domain. Test sign-up, owner isolation, export and deletion before opening access. The hosted deployment's exact database region is not declared in this repository; select and disclose the region for your own deployment.

## Android build

The Android workspace and final Expo build steps are being supplied by brief 06. Native identity and push require an Android development build. Configure your own Clerk public identifier, Convex URL, Expo project and Android signing credentials. An EAS or local Expo build requires an Android toolchain and an installed mobile workspace. Do not infer a working APK from a successful web build.

## Verify before operating it

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

The tests are local. They do not configure cloud projects, prove a production OAuth flow or deliver a notification. Review the report for each brief and complete deployment checks on your own infrastructure. Read [CONTRIBUTING.md](https://github.com/kausthubh-coder/kriyan-garden/blob/main/CONTRIBUTING.md) for the review workflow.
