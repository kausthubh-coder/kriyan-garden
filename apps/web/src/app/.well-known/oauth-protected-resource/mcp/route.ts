import { metadataCorsOptionsRequestHandler, protectedResourceHandlerClerk } from "@clerk/mcp-tools/next";
import { SCOPES } from "@/lib/operations/scopes";
import { mcpResourceUrl } from "@/lib/operations/origin";

export function GET(request: Request) {
  return protectedResourceHandlerClerk({ resource: mcpResourceUrl(request), scopes_supported: [...SCOPES], resource_name: "Kriyan", resource_documentation: "https://app.kriyan.app/docs/mcp" })(request);
}
export const OPTIONS = metadataCorsOptionsRequestHandler();
