import { metadataCorsOptionsRequestHandler, protectedResourceHandlerClerk } from "@clerk/mcp-tools/next";
import { SCOPES } from "@/lib/operations/scopes";
import { apiResourceUrl } from "@/lib/operations/origin";

export function GET(request: Request) {
  return protectedResourceHandlerClerk({ resource: apiResourceUrl(request), scopes_supported: [...SCOPES], resource_name: "Kriyan API" })(request);
}
export const OPTIONS = metadataCorsOptionsRequestHandler();
