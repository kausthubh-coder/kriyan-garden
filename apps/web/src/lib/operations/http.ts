import { auth } from "@clerk/nextjs/server";
import { runOperation, type Caller, type OperationName } from "./index";
import { OperationError, publicError } from "./errors";
import { verifyUserOAuth } from "./oauth";
import { apiResourceUrl, apiResourceMetadataUrl } from "./origin";

export async function apiCaller(request: Request): Promise<Caller> {
  const state = await auth({ acceptsToken: "oauth_token" });
  if (!state.isAuthenticated || state.tokenType !== "oauth_token") throw new OperationError("UNAUTHENTICATED", "Sign in with kriyan login and try again.", 401);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const verified = await verifyUserOAuth(bearer, apiResourceUrl(request));
  if (!verified) throw new OperationError("INVALID_TOKEN", "This login is not valid for the Kriyan API. Run kriyan login again.", 401);
  return { userId: verified.extra.userId };
}
export async function requestInput(request: Request): Promise<Record<string, unknown>> {
  const input: Record<string, unknown> = Object.fromEntries(new URL(request.url).searchParams);
  if (typeof input.limit === "string") input.limit = Number(input.limit);
  if (request.method !== "GET") {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new OperationError("UNSUPPORTED_MEDIA_TYPE", "Send a JSON body with Content-Type: application/json.", 415);
    const body = await request.text();
    if (body.length > 150000) throw new OperationError("PAYLOAD_TOO_LARGE", "Shorten the request to at most 150000 characters.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { throw new OperationError("INVALID_JSON", "The JSON body could not be read. Check it and try again."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new OperationError("INVALID_JSON", "Send a JSON object and try again.");
    Object.assign(input, parsed);
  }
  return input;
}
export function apiRoute(name: OperationName, options: { id?: string; created?: boolean } = {}) {
  return async (request: Request): Promise<Response> => {
    try {
      const caller = await apiCaller(request);
      const input = await requestInput(request);
      if (options.id) input.id = options.id;
      const value = await runOperation(name, input, caller);
      return Response.json(value, { status: options.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    } catch (error) { return apiErrorResponse(error, request); }
  };
}
export function apiErrorResponse(error: unknown, request?: Request) {
  const safe = publicError(error);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  const metadata = request ? `resource_metadata="${apiResourceMetadataUrl(request)}"` : "";
  if (safe.status === 401) {
    const parameters = [safe.code === "INVALID_TOKEN" ? 'error="invalid_token"' : "", metadata].filter(Boolean).join(", ");
    headers["WWW-Authenticate"] = parameters ? `Bearer ${parameters}` : "Bearer";
  }
  if (safe.status === 429) headers["Retry-After"] = "60";
  return Response.json({ error: { code: safe.code, message: safe.message, ...(safe.candidates ? { candidates: safe.candidates } : {}) } }, { status: safe.status, headers });
}
