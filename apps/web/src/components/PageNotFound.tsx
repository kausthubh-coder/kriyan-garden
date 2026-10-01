import { appHref, KRIYAN_MARKETING_ORIGIN } from "@/lib/origins";
import s from "./PageNotFound.module.css";

export function PageNotFound({ appHost }: { appHost: boolean }) {
  const app = appHref("/app"), home = process.env.NODE_ENV === "development" ? "/" : KRIYAN_MARKETING_ORIGIN;
  return <main className={s.page}>
    <a className={s.wordmark} href={appHost ? app : home}>kriyan</a>
    <div className={s.middle}>
      <h1>This page does not exist.</h1>
      <p>The link may be old, or the address may have a typo.</p>
      <div className={s.actions}>
        <a className={s.primary} href={appHost ? app : home}>{appHost ? "Open Kriyan" : "Go to the home page"}</a>
        <a className={s.secondary} href={appHost ? home : app}>{appHost ? "Go to the home page" : "Open Kriyan"}</a>
      </div>
    </div>
  </main>;
}
