import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const docPages = [["index", "Getting started"], ["quick-add", "Quick add"], ["mcp", "MCP"], ["api", "API"], ["cli", "CLI"], ["android", "Android"], ["self-hosting", "Self-hosting"], ["privacy", "Privacy"], ["terms", "Terms"]] as const;
export function readDoc(slug: string) {
  if (!docPages.some(([key]) => key === slug)) return null;
  return readFile(path.join(process.cwd(), "../../docs/site", `${slug}.md`), "utf8");
}
export async function setupSnippets() {
  const markdown = await readDoc("mcp");
  if (!markdown) return [];
  return ["Claude", "Claude Code", "ChatGPT", "Cursor", "VS Code"].flatMap((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = markdown.match(new RegExp(`## ${escaped}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
    const snippet = match?.[1].match(/```[^\n]*\n([\s\S]*?)```/)?.[1].trim();
    return snippet ? [{ name, text: snippet }] : [];
  });
}
