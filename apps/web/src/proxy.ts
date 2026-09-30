import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { hostRedirect } from "@/lib/origins";

const authenticated = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    await auth.protect();
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
  return needsIdentity ? authenticated(request, event) : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
