import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { KRIYAN_APP_ORIGIN, KRIYAN_MARKETING_HOSTS } from "@/lib/origins";

export default clerkMiddleware(async (auth, request) => {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (hostname && KRIYAN_MARKETING_HOSTS.has(hostname) && pathname !== "/") {
    return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, KRIYAN_APP_ORIGIN), 307);
  }

  if (hostname?.endsWith(".vercel.app") && pathname === "/") {
    return NextResponse.redirect(new URL("/app", request.url), 307);
  }

  if (pathname === "/garden" || pathname.startsWith("/garden/")) {
    return NextResponse.redirect(new URL("/app", request.url), 307);
  }
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
