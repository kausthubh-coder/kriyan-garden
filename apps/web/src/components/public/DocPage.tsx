import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PublicNav, PublicFooter } from "./Chrome";
import { docPages } from "@/lib/docs";
import { appHref, KRIYAN_APP_ORIGIN } from "@/lib/origins";
import s from "./Public.module.css";
export function DocPage({ slug, markdown }: { slug: string; markdown: string }) {
  const index = <nav className={s.index} aria-label="Documentation">{docPages.map(([key, label]) => <a key={key} href={key === "index" ? "/docs" : `/docs/${key}`} aria-current={key === slug ? "page" : undefined}>{label}</a>)}</nav>;
  return <div className={s.site}><PublicNav /><div className={s.docs}><aside className={s.desktopIndex}>{index}</aside><div><details className={s.phoneIndex}><summary>Browse docs</summary>{index}</details><main id="content" className={s.article}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: ({ children }) => <div className={s.table} role="region" aria-label="Documentation table" tabIndex={0}><table>{children}</table></div>, a: ({ href, children }) => <a href={href?.startsWith(`${KRIYAN_APP_ORIGIN}/`) ? appHref(href.slice(KRIYAN_APP_ORIGIN.length)) : href}>{children}</a> }}>{markdown}</ReactMarkdown></main></div></div><PublicFooter /></div>;
}
