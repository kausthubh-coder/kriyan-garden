import Link from "next/link";
import styles from "./landing.module.css";

export default function Home() {
  return (
    <main className={styles.landing}>
      <section className={styles.mark} aria-labelledby="kriyan-title">
        <div className={styles.wordmarkRow}>
          <span className={styles.seed} aria-hidden="true" />
          <h1 id="kriyan-title">kriyan</h1>
        </div>
        <p>a garden for the things you mean<br />to keep.</p>
        <Link className={styles.enter} href="/garden">enter</Link>
      </section>
      <div className={styles.todayLine} aria-hidden="true"><span>today</span><i /></div>
    </main>
  );
}
