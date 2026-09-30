import type { Metadata } from "next";
import { DocPage } from "@/components/public/DocPage";
import { readDoc } from "@/lib/docs";
export const metadata: Metadata = { title: "Privacy", description: "What Kriyan stores, who can access it, and how to export or delete it.", alternates: { canonical: "/privacy" } };
export default async function Privacy() { return <DocPage slug="privacy" markdown={await readDoc("privacy") ?? "# Privacy\nPolicy could not be loaded. Reload this page or contact kausthubh2007@gmail.com."} />; }
