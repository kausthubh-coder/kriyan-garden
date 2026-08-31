# Kriyan hosted app plan

## Product decisions

- Kriyan will be a hosted product. Users create an account and sign in. They do not create a Convex project or paste deployment URLs.
- The source code will be public under an open-source license. The official Kriyan deployment will use Clerk, Convex, and Vercel.
- The existing calm Garden, Distance, Calendar, task editor, onboarding, spaces, repeats, and reminders remain the product base.
- Bun remains the package manager.
- Due dates determine Distance placement. The task form will not expose a separate now, this season, or someday input.

## MCP or CLI

Build the MCP server first.

| Question | MCP | CLI |
| --- | --- | --- |
| Fastest to prototype | More setup | Easier |
| Works naturally in Codex, Cursor, Claude, and other AI hosts | Yes | Depends on shell access and prompt instructions |
| Typed tool discovery | Built in | Must be documented manually |
| Hosted user login | Clerk OAuth | Browser login plus local token storage |
| User installation | Connect one remote URL | Install and update a package |
| Best fit for Kriyan | Yes | Useful later for developers and power users |

The MCP endpoint should live inside the Next.js app at `/mcp` and use Streamable HTTP. Clerk will handle OAuth and consent. A later CLI should call the same task operations rather than implement a second backend.

## Target architecture

### Next.js

- Keep the current Next.js 16 App Router project and visual components.
- Add public landing, sign-in, sign-up, and OAuth consent routes.
- Protect `/garden` and other account routes with Clerk.
- Put `<ClerkProvider>` and the client-side `ConvexProviderWithClerk` wrapper inside the root body.
- Replace the large client-owned data snapshot in `KriyanApp` with reactive Convex hooks.
- Add `/mcp` and the required public `.well-known` OAuth metadata Route Handlers.

### Clerk

- Clerk owns user sign-in, sessions, profile controls, and MCP OAuth consent.
- Use the Clerk user ID as the stable Kriyan owner ID.
- Start with personal accounts only. Do not add Organizations until sharing becomes a real feature.
- Define narrow MCP scopes such as `tasks:read`, `tasks:write`, `spaces:read`, and `spaces:write`.

### Convex

- Remove `better-sqlite3`, `.data/kriyan.db`, and `src/lib/db.ts` after the Convex version is verified.
- Add `convex/auth.config.ts` for the Clerk issuer and push it to both development and production deployments.
- Every user-owned row includes `ownerId`. Every query uses an owner index. Every mutation checks `ctx.auth.getUserIdentity()` before reading or writing.
- Use reactive `useQuery` and `useMutation` calls in the app. Do not keep a second server-state system in React.

Initial tables:

- `users`: `ownerId`, onboarding state, timezone, created date.
- `spaces`: `ownerId`, name, color, note, sort order.
- `tasks`: `ownerId`, space ID, title, due date and time, duration, structured repeat rule, status, completion time, sort order, timestamps.
- `reminders`: `ownerId`, task ID, trigger rule, scheduled time, delivery state.
- `pages`: `ownerId`, task ID or parent page ID, title, block document, timestamps.

The main indexes should begin with `ownerId`, then the field used by the view. Examples include owner plus status, owner plus due date, owner plus space, and owner plus updated date.

### MCP access to Convex

- The MCP Route Handler validates the user's Clerk OAuth token and reads the verified Clerk user ID from `authInfo`.
- Do not forward the incoming MCP bearer token to Convex. MCP authorization rules prohibit token passthrough to another service.
- Add a small set of MCP-only Convex functions protected by a server credential shared between the Next.js deployment and Convex. The MCP handler supplies the verified user ID. Those functions validate the service credential before using that user ID.
- Keep the actual task validation and write logic shared between web mutations and MCP mutations so they cannot drift.
- Revisit Clerk M2M tokens later if a separate MCP service is introduced. They are unnecessary for the first same-app deployment.

## First MCP tools

- `list_tasks`: filter by date range, status, space, or text.
- `get_task`: return one task, its reminders, and its note page.
- `create_task`: create a task with optional space, due date, duration, repeat rule, reminders, and notes.
- `update_task`: change explicitly supplied fields only.
- `complete_task`: complete or reopen a task.
- `list_spaces`: return the user's spaces and colors.
- `create_space`: create a named space.
- `search_notes`: search task titles and note content.

Do not expose permanent deletion in the first MCP release. Completion and edits are recoverable. Add deletion only after an activity log or trash exists.

## Delivery phases

### Phase 1: protect the current app

1. Add Clerk packages, environment templates, provider wiring, sign-in, sign-up, and user controls.
2. Protect `/garden` and verify auth again inside every server operation.
3. Keep SQLite temporarily so auth can be tested without mixing in the database migration.

Exit condition: two Clerk users can sign in, and protected pages reject signed-out requests.

### Phase 2: move the data model to Convex

1. Add Convex, Clerk auth configuration, schema, indexes, validators, and generated types.
2. Implement spaces, onboarding, task CRUD, completion, Calendar reads, and Distance reads.
3. Derive Distance from the due date instead of accepting a separate field.
4. Add structured repeat and reminder data. Keep delivery itself out of this phase.

Exit condition: two users have isolated data and can complete the main web flows after reload.

### Phase 3: rewire the frontend

1. Replace SQLite server actions with Convex hooks.
2. Keep the existing visual components and move data ownership out of `KriyanApp`.
3. Add loading, empty, error, optimistic update, and offline reconnect states.
4. Remove SQLite only after the Convex version passes the same browser flows.

Exit condition: Garden, Distance, Calendar, spaces, onboarding, task editing, notes, repeats, and reminders work from Convex.

### Phase 4: add remote MCP

1. Add `mcp-handler` and `@clerk/mcp-tools`.
2. Create the `/mcp` Route Handler and OAuth metadata routes.
3. Configure Clerk OAuth scopes and keep the Clerk consent screen enabled.
4. Implement the read tools first, then the write tools.
5. Test the deployed endpoint from Codex, Cursor, and one other MCP client.

Exit condition: a signed-in user can ask an AI client to list, create, update, and complete only their own Kriyan tasks.

### Phase 5: production hardening

1. Add auth isolation tests for every Convex function and MCP tool.
2. Add rate limits, structured audit events, input limits, and safe error responses.
3. Add reminder scheduling and delivery only after timezone and recurrence tests are solid.
4. Set separate Clerk and Convex development and production configuration.
5. Deploy the Next.js app to Vercel and the backend to Convex production.

Exit condition: production signup, web task flows, OAuth connection, and MCP tool calls pass end to end.

### Phase 6: optional CLI

- Publish a Bun-compatible `kriyan` package after MCP is stable.
- Commands can include `kriyan login`, `kriyan task list`, `kriyan task add`, and `kriyan task done`.
- The CLI should use the same hosted operations and Clerk browser login. It must not access Convex tables directly or duplicate validation.

## Verification gates

- `bun run lint`
- `bunx tsc --noEmit`
- `bunx convex dev --once`
- `bun run build`
- Browser tests for onboarding, spaces, create, edit, complete, Calendar, and Distance.
- Cross-user isolation tests for web and MCP.
- OAuth discovery, consent, token expiry, and revoked-access tests.
- MCP schema tests for missing fields, invalid dates, unsafe note sizes, and unauthorized writes.

## Explicitly out of scope for the first hosted release

- Self-hosting setup and user-supplied Convex deployments.
- Android application and native alarm takeover.
- Sharing, teams, and Clerk Organizations.
- AI chat inside Kriyan.
- Plugin marketplace.
- A public destructive task-delete MCP tool.

