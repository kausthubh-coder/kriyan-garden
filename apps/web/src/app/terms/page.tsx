import type { Metadata } from "next";
import { DocPage } from "@/components/public/DocPage";
import { readDoc } from "@/lib/docs";
export const metadata: Metadata = { title: "Terms", description: "Terms for the free Kriyan hosted planner and MIT-licensed software.", alternates: { canonical: "/terms" } };
export default async function Terms() { return <DocPage slug="terms" markdown={await readDoc("terms") ?? "# Terms\nTerms could not be loaded. Reload this page or contact kausthubh2007@gmail.com."} />; }
