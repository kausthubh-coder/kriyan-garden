import { metadataCorsOptionsRequestHandler, protectedResourceHandlerClerk } from "@clerk/mcp-tools/next";

export const GET = protectedResourceHandlerClerk({ scopes_supported: ["openid", "profile", "email"] });
export const OPTIONS = metadataCorsOptionsRequestHandler();
