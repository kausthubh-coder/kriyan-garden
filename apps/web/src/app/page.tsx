/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { PublicNav, PublicFooter } from "@/components/public/Chrome";
import { QuickAddStrip } from "@/components/public/QuickAddStrip";
import { SetupTabs } from "@/components/public/SetupTabs";
import { DemoEmbed } from "@/components/public/DemoEmbed";
import { TimelineFragment, PaceFragment, LoadFragment } from "@/components/public/ProductFragments";
import { setupSnippets } from "@/lib/docs";
import { appHref, KRIYAN_REPOSITORY } from "@/lib/origins";
import { androidRelease, apkLabel, KRIYAN_APK } from "@/lib/android-release";
import s from "@/components/public/Public.module.css";
export const metadata: Metadata = { title: { absolute: "Kriyan | Organise your life with your AI" }, description: "An open-source planner that makes organising and planning your life easy. Plan with the AI you already use.", alternates: { canonical: "/" } };
export default async function Landing() {
  const snippets = await setupSnippets();
  const release = androidRelease();
  const android = existsSync(path.join(process.cwd(), "public/landing/android-day.webp"));
  return <div className={s.site}><PublicNav /><main id="content">
    <header className={s.hero}><h1>Your day on one timeline.</h1><p>Kriyan is an open-source planner that makes it easy to organise your life and get more done. Tasks with a time sit on the timeline. Tasks without one wait beside it. Length is optional.</p><div className={s.actions}><a className={s.button} href={appHref("/app")}>Open Kriyan</a><a className={`${s.button} ${s.secondary}`} href={KRIYAN_APK}>Get Android app</a></div></header>
    <DemoEmbed /><p className={s.caption}>Try it. This is the real app with sample data, and nothing you do here is saved.</p>
    <section className={`${s.section} ${s.center}`}><QuickAddStrip /></section>
    <section className={`${s.section} ${s.feature}`}><div><h2>When will I do it?</h2><p>Drag a task onto the day to give it a time. Add a length when it helps, or leave it as a marker. Classes and meetings sit on the same timeline, so you see what is really free.</p></div><TimelineFragment /></section>
    <section className={`${s.section} ${s.feature} ${s.flip}`}><div className={s.featureCopy}><h2>Am I on pace?</h2><p>Every goal shows where you are and where you should be today. Every deadline shows the time it needs against the time you have, so you can make room before the date arrives.</p></div><PaceFragment /></section>
    <section className={`${s.section} ${s.feature}`}><div><h2>What is left?</h2><p>See the week&apos;s load by area, spot the day that is too full, and move work to a lighter one. The list shows what is left in each of your areas.</p></div><LoadFragment /></section>
    <section className={`${s.section} ${s.ai}`}><div><h2>Plan with the AI you already use.</h2><p>Kriyan has an MCP server. Connect Claude, ChatGPT or Cursor, approve access once, and ask it to plan your day, move tasks or check a deadline. It sees the same tasks and goals you do. Ask it what to do first, to clear a day, or to plan the week.</p><p className={s.label}>Or from the terminal</p><pre className={s.code}><code>{'bun run kriyan add "essay fri 5pm #econ 2h"\nbun run kriyan today'}</code></pre><a className={s.cliLink} href="/docs/cli">Read the CLI docs</a></div><div><SetupTabs snippets={snippets} /><p className={s.label}>Sign in happens in your browser. Kriyan never sees your AI account, and the AI only gets the access you approve.</p></div></section>
    <section className={`${s.section} ${s.feature}`}><div><h2>Kriyan on your phone.</h2><p>The Android app has the same timeline, quick add and goals, with reminders that arrive even when a task was added on the web or by an AI.</p><div className={s.androidActions}><a className={s.button} href={KRIYAN_APK}>Get Android app</a><a href="/docs/android">Install guide</a></div><p className={s.label}>{apkLabel(release)}. Free, from GitHub. Android will warn about installing outside the Play Store; tap Settings and allow installs from your browser.</p></div><div className={s.phone}>{android ? <Image src="/landing/android-day.webp" alt="Kriyan Android Day screen" width={300} height={600} sizes="300px" /> : <DemoEmbed phone />}</div></section>
    <section className={s.oss}><h2>Read every line.</h2><p>Kriyan is open source under the MIT licence. The hosted version is free, and your data is yours to export or delete at any time.</p><div className={s.actions}><a className={`${s.button} ${s.secondary}`} href={KRIYAN_REPOSITORY}>View source</a><a className={`${s.button} ${s.secondary}`} href="/docs/self-hosting">Host Kriyan</a></div></section>
  </main><PublicFooter /></div>;
}
