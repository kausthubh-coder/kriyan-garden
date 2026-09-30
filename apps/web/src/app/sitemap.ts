import type { MetadataRoute } from "next";
import { docPages } from "@/lib/docs";
import { KRIYAN_MARKETING_ORIGIN } from "@/lib/origins";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/privacy", "/terms", ...docPages.map(([slug]) => slug === "index" ? "/docs" : `/docs/${slug}`)].map((route) => ({ url: `${KRIYAN_MARKETING_ORIGIN}${route}` }));
}
