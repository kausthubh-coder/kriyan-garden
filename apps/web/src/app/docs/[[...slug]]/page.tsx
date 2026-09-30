import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocPage } from "@/components/public/DocPage";
import { docPages, readDoc } from "@/lib/docs";
type Props = { params: Promise<{ slug?: string[] }> };
export function generateStaticParams() { return docPages.map(([key]) => ({ slug: key === "index" ? [] : [key] })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const entry = docPages.find(([key]) => key === (slug[0] ?? "index"));
  return { title: entry?.[1] ?? "Documentation", description: `Kriyan documentation: ${entry?.[1] ?? "tasks, goals and setup"}.`, alternates: { canonical: slug.length ? `/docs/${slug.join("/")}` : "/docs" } };
}
export default async function Page({ params }: Props) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const key = slug[0] ?? "index", markdown = await readDoc(key);
  if (!markdown) notFound();
  return <DocPage slug={key} markdown={markdown} />;
}
