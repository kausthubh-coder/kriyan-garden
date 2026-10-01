/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "@/components/public/Chrome";
import { androidRelease, apkLabel, KRIYAN_APK } from "@/lib/android-release";
import s from "@/components/public/Public.module.css";
export const metadata: Metadata = { title: "Download Kriyan for Android", alternates: { canonical: "/download" } };
export default function Download() {
  const release = androidRelease();
  return <div className={s.site}><PublicNav /><main id="content" className={`${s.section} ${s.article}`}>
    <h1>Get Kriyan for Android</h1>
    <p>{apkLabel(release)}. Android 7.0 or newer.</p>
    <a className={s.button} href={KRIYAN_APK}>Download Android app</a>
    <p>Android will warn about installing outside the Play Store; tap Settings, allow installs from your browser, then open the APK.</p>
    <ol><li>Download the APK.</li><li>Allow installs from your browser when Android asks.</li><li>Open the APK and tap Install.</li></ol>
    <p><a href="/docs/android">Read the Android guide</a></p>
  </main><PublicFooter /></div>;
}
