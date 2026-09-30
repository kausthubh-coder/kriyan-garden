import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { KRIYAN_APP_ORIGIN, KRIYAN_MARKETING_HOSTS } from "@/lib/origins";
import { policyConfiguration, securityPolicy } from "@/lib/security-policy";

export default clerkMiddleware(async (auth, request) => {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (hostname && KRIYAN_MARKETING_HOSTS.has(hostname) && pathname !== "/") {
    return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, KRIYAN_APP_ORIGIN), 307);
  }

  if ((hostname === "app.kriyan.app" || hostname?.endsWith(".vercel.app")) && pathname === "/") {
    return NextResponse.redirect(new URL("/app", request.url), 307);
  }

  if (pathname === "/garden" || pathname.startsWith("/garden/")) {
    return NextResponse.redirect(new URL("/app", request.url), 307);
  }
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    await auth.protect();
  }
  if (["/app", "/sign-in", "/sign-up"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    // Next's bundled CSP guide: put the policy on the forwarded request so
    // the framework can nonce its runtime scripts during dynamic rendering.
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const policy = securityPolicy(policyConfiguration(), nonce);
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
