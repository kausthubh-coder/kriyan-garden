# Development OAuth setup for the supervisor

These are reviewable setup examples, not executed mutations. This worker leaves Clerk, Convex, Vercel and GitHub settings to the supervisor. No secret values belong in these payloads or logs. Use the linked `apps/web` directory and explicitly target `--instance dev`. Confirm the intended linked application before executing a write.

## Canonical resources

| Client | OAuth resource and required token audience | Protected-resource metadata |
| --- | --- | --- |
| MCP clients | `https://app.kriyan.app/mcp` | `/.well-known/oauth-protected-resource/mcp` |
| REST and CLI | `https://app.kriyan.app/api/v1` | `/.well-known/oauth-protected-resource/api/v1` |

Both use `MCP_PUBLIC_ORIGIN` as the configured public HTTPS origin. Its existing name is retained for compatibility. Set it to the deployed public development origin when that differs from the default app origin. In local dev without that setting, use the same loopback origin for `KRIYAN_URL` and requests. Production never derives these resources from internal proxy hosts or forwarded headers. Resource URLs have no trailing slash.

`GET /api/v1/auth-config?timezone=America%2FNew_York` returns a public `resource` alongside client ID, Clerk endpoints, scopes and effective calendar. The CLI requires it to equal its configured app origin plus `/api/v1`. Authorization, code exchange and refresh all send that resource. Tokens must be verified against it before using their subject/scopes. Decoding a JWT or reading middleware claims alone is insufficient.

## Official schema evidence

Reviewed the current [Clerk BAPI OpenAPI document, version 2026-05-12](https://github.com/clerk/openapi-specs/blob/main/bapi/2026-05-12.yml), [Platform API schema](https://github.com/clerk/openapi-specs/blob/main/platform/beta.yml), and linked `clerk config schema --instance dev`. These schemas are definitions, not credential files. The BAPI settings schema explicitly supports audience derived from the RFC 8707 resource parameter. The installed `@clerk/backend@3.21.0` verifies the actual access token through BAPI and enforces the supplied expected audience. See [Clerk token verification](https://clerk.com/docs/guides/configure/auth-strategies/oauth/verify-oauth-tokens) and [MCP resource binding](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#resource-parameter-implementation).

The public schema provides exact settings and OAuth-application payloads below. It does not publish a custom OAuth-scope catalog creation endpoint or a User API-key enablement field. The CLI catalog also lacks a custom-scope management endpoint. The generic Platform config patch schema accepts unspecified keys, so it does not establish that an invented setting key is valid. Use the documented dashboard steps for those two operations.

## Create and advertise custom scopes in the dashboard

In **OAuth applications > Scopes**, create these keys and advertise each in authorization metadata:

| Key | Suggested consent description |
| --- | --- |
| `tasks:read` | Read your tasks and plans |
| `tasks:write` | Add and update your tasks |
| `spaces:read` | Read your areas, projects and courses |
| `spaces:write` | Create and update your projects and courses |
| `goals:read` | Read your goals and milestones |
| `goals:write` | Add and update your goals and milestones |

Assign the custom scopes to permitted applications. Advertising a scope does not assign it. Custom keys must exist before the settings or application payloads reference them. These dashboard steps follow [Clerk's custom-scope documentation](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth#custom-scopes). No undocumented catalog-create payload is proposed.

## Instance OAuth settings payload

After creating the custom catalog, save the following as a temporary non-secret JSON file, for example `.data/brief05-audience/oauth-settings.json`:

```json
{
  "dynamic_oauth_client_registration": true,
  "client_id_metadata_documents_advertised": true,
  "aud_claim_enabled": true,
  "default_scopes": [
    "tasks:read", "tasks:write",
    "spaces:read", "spaces:write",
    "goals:read", "goals:write"
  ]
}
```

The exact public endpoint is `PATCH /instance/oauth_application_settings`. A supervisor can inspect a dry run before authorizing execution:

```powershell
clerk api /instance/oauth_application_settings --instance dev -X PATCH --file ../../.data/brief05-audience/oauth-settings.json --dry-run
```

The payload enables CIMD publication and resource audience claims and preserves DCR on. It does not change existing CIMD admission restrictions, token format or global PKCE policy. Configure those separately if needed.

**Do not put `offline_access` in `default_scopes`.** The official request schema rejects it there, along with unknown or duplicate keys. Refresh-capable clients request it explicitly. This corrects the initial Brief 05 report's earlier recommendation to include it in defaults.

## Public CLI application payload

The exact public endpoint is `POST /oauth_applications`. Save this reviewable non-secret request as `.data/brief05-audience/cli-application.json`:

```json
{
  "name": "Kriyan CLI",
  "public": true,
  "redirect_uris": ["http://127.0.0.1/callback"],
  "pkce_required": true,
  "consent_screen_enabled": true,
  "scopes": "tasks:read tasks:write spaces:read spaces:write goals:read goals:write offline_access"
}
```

```powershell
clerk api /oauth_applications --instance dev -X POST --file ../../.data/brief05-audience/cli-application.json --dry-run
```

`scopes` is a space-delimited string, not an array, and the scope ceiling includes the custom catalog keys. Clerk supports the registered loopback URI with the runtime ephemeral port. See [Clerk's CLI guidance](https://clerk.com/blog/adding-clerk-auth-to-your-cli). After creation, set the web server's public `CLERK_CLI_CLIENT_ID`. Treat the complete create response as sensitive because it may contain a generated client secret even for a public client. Capture it in memory and report only the public client ID and selected safe settings. The CLI never needs a client secret.

Read the OAuth applications list first to avoid a duplicate application if another supervisor has already completed setup. This worker did not refresh or mutate the earlier empty-list snapshot.

## User API keys

In Clerk's **API keys** page, choose **Enable API keys**, select **Enable User API keys**, then **Enable**. Organization API keys do not authenticate Kriyan's personal-account API. These steps follow [Clerk's API-key guide](https://clerk.com/docs/guides/development/machine-auth/api-keys#prerequisites). No verified public API enablement payload was found, so no guessed feature-toggle request is supplied.

Once enabled, the published `POST /api_keys` schema supports an isolated user-owned test key. Its safe request shape is:

```json
{
  "name": "Kriyan disposable development check",
  "subject": "REPLACE_WITH_DISPOSABLE_USER_ID",
  "scopes": ["tasks:read", "spaces:read", "goals:read"],
  "seconds_until_expiration": 600
}
```

Capture the response and key secret only in memory. Do not log it. Use the existing disposable live-check procedure only after configuration and backend deployment, then revoke keys and remove records/identities. The previous dev snapshot had API keys disabled; this review fix creates no new identity or key.

## Validation after supervisor setup

Read settings and public authorization metadata without logging full sensitive configuration. Confirm the six custom scopes are advertised, CIMD publication and audience claims are enabled, and the CLI application is public with PKCE and consent required. Complete a real CLI login, verify REST access, refresh, and try a `/mcp`-audience token against REST and a REST-audience token against MCP. Each wrong-resource request must return 401. Test a correctly scoped user key separately. The new offline tests verify these contracts; they do not claim a live provider integration pass.
