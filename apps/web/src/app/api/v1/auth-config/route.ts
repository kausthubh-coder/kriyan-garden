import { fetchClerkAuthorizationServerMetadata } from "@clerk/mcp-tools/server";
import { z } from "zod";
import { localClock } from "@kriyan/core";
import { schemas } from "@/lib/operations/schemas";
import { apiResourceUrl } from "@/lib/operations/origin";
import { SCOPES } from "@/lib/operations/scopes";
import { OperationError } from "@/lib/operations/errors";
import { apiErrorResponse, requestInput } from "@/lib/operations/http";

const metadata = z.object({ authorization_endpoint: z.url().startsWith("https://"), token_endpoint: z.url().startsWith("https://") });
export async function GET(request: Request) {
  try {
    const clientId = process.env.CLERK_CLI_CLIENT_ID;
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!clientId || !publishableKey) throw new OperationError("AUTH_NOT_CONFIGURED", "CLI login is not configured. Ask the administrator to register Kriyan CLI and set CLERK_CLI_CLIENT_ID.", 503);
    const calendar = schemas.me.parse(await requestInput(request));
    if (!calendar.timezone) throw new OperationError("TIMEZONE_REQUIRED", "Send your device's IANA timezone when requesting login settings.");
    const today = calendar.today ?? localClock(new Date(), calendar.timezone).today;
    const discovered = metadata.parse(await fetchClerkAuthorizationServerMetadata({ publishableKey }));
    return Response.json({ clientId, authorizationEndpoint: discovered.authorization_endpoint, tokenEndpoint: discovered.token_endpoint, resource: apiResourceUrl(request), scopes: [...SCOPES, "offline_access"], today, timezone: calendar.timezone }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error, [], request); }
}
