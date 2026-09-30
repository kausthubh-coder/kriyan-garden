import Link from "next/link";
import { KRIYAN_APP_ORIGIN } from "@/lib/origins";
import styles from "./landing.module.css";

export default function Home() {
  const gardenHref = process.env.NODE_ENV === "development" ? "/garden" : `${KRIYAN_APP_ORIGIN}/garden`;

  return (
    <main className={styles.landing}>
      <section className={styles.mark} aria-labelledby="kriyan-title">
        <div className={styles.wordmarkRow}>
          <span className={styles.seed} aria-hidden="true" />
          <h1 id="kriyan-title">kriyan</h1>
        </div>
        <p>a garden for the things you mean<br />to keep.</p>
        <Link className={styles.enter} href={gardenHref}>enter</Link>
      </section>
      <div className={styles.todayLine} aria-hidden="true"><span>today</span><i /></div>
    </main>
  );
}
