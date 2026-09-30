/* Plain links keep public navigation server-rendered, with no prefetch client. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { appHref, KRIYAN_REPOSITORY } from "@/lib/origins";
import s from "./Public.module.css";
export function PublicNav() { return <><a className={s.skip} href="#content">Skip to content</a><nav className={s.nav} aria-label="Website"><a className={s.wordmark} href="/">kriyan</a><a href="/docs">Docs</a><a href={KRIYAN_REPOSITORY}>GitHub</a><a href="/download">Download</a><a className={s.button} href={appHref("/app")}>Open Kriyan</a></nav></>; }
export function PublicFooter() { return <footer className={s.footer}><a href="/docs">Docs</a><a href={KRIYAN_REPOSITORY}>GitHub</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>Made by Kausthubh</span></footer>; }
