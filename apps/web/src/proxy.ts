import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { hostRedirect } from "@/lib/origins";
import { policyConfiguration, securityPolicy } from "@/lib/security-policy";

const authenticated = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    await auth.protect();
  }
  if (["/app", "/sign-in", "/sign-up"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    // Next's bundled CSP guide: put the policy on the forwarded request so
    // the framework can nonce its runtime scripts during dynamic rendering.
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const policy = securityPolicy(policyConfiguration(), nonce);
    const headers = new Headers(request.headers);
    headers.set("x-kriyan-path", pathname);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  const { pathname, search } = request.nextUrl;
  const redirect = hostRedirect(hostname, pathname, search);
  if (redirect) return NextResponse.redirect(redirect, 307);
  if (pathname === "/garden" || pathname.startsWith("/garden/")) {
    return NextResponse.redirect(new URL("/app", request.url), 307);
  }
  // Public pages and the memory demo do not need Clerk or its browser scripts.
  const needsIdentity = ["/app", "/sign-in", "/sign-up", "/mcp", "/api", "/__clerk", "/.well-known"].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (needsIdentity) return authenticated(request, event);
  const headers = new Headers(request.headers);
  headers.set("x-kriyan-path", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
