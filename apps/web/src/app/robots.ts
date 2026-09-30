import type { MetadataRoute } from "next";
import { KRIYAN_MARKETING_ORIGIN } from "@/lib/origins";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/app", "/demo", "/sign-in", "/sign-up", "/api/", "/mcp"] }, sitemap: `${KRIYAN_MARKETING_ORIGIN}/sitemap.xml` }; }
