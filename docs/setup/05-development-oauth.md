# How Clerk is configured

Kriyan uses the Clerk development instance for the hosted product, including production. There is no Clerk production instance to configure. Development has a 100-user limit and displays Clerk's development banner on hosted sign-in and consent pages.

## OAuth settings

Dynamic client registration, client ID metadata documents and resource-derived audience claims are enabled. They were configured through the Clerk CLI Backend API, using `clerk api /instance/oauth_application_settings --instance dev`. Brief 19 confirmed all three with a read-only call and did not change instance settings.

The public OAuth application named Kriyan CLI exists with PKCE required, consent on, redirect URI `http://127.0.0.1/callback` and scopes `openid profile email offline_access`. It was created through `clerk api /oauth_applications --instance dev`. Clerk accepts the runtime loopback port chosen by the CLI. Its client ID is read from `CLERK_CLI_CLIENT_ID` in the web environment and Vercel. Do not put its value in reports.

## Resource binding

| Caller | Exact resource | Metadata path |
| --- | --- | --- |
| MCP | `https://app.kriyan.app/mcp` | `/.well-known/oauth-protected-resource/mcp` |
| API and CLI | `https://app.kriyan.app/api/v1` | `/.well-known/oauth-protected-resource/api/v1` |

Both resources use `MCP_PUBLIC_ORIGIN` as the public HTTPS origin. Local development without that setting uses the request's loopback origin. Forwarded headers never choose the production resource. Resource URLs have no trailing slash.

Clients request `openid profile email`, adding `offline_access` when they need refresh. Kriyan verifies the actual token for the exact resource and takes its verified user ID as the owner. A valid token grants full access to that user's planner. MCP and API tokens cannot be interchanged. Missing audiences, expired or revoked tokens and non-user identities are refused.

Browser login with S256 PKCE and silent refresh is the CLI's authentication path. No custom scopes or user API keys are required. Nothing needs the Clerk dashboard.

Run `node .agents/skills/test-kriyan/scripts/doctor.mjs` to check development keys, the matching Convex deployment and the OAuth configuration. The script makes no settings changes. See [Clerk's OAuth implementation](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth) and the [live auth report](../reports/18-auth.md).
