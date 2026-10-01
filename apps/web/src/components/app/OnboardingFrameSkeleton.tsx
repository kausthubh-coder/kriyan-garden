import app from "./App.module.css";
import s from "./Onboarding.module.css";
/** The URL suspense fallback and the data-loading view use the same geometry. */
export function OnboardingFrameSkeleton() {
  return (
    <div className={app.app} data-welcome="true">
      <main className={s.frame} aria-busy="true">
        <header className={s.top}>
          <b className={s.wordmark}>kriyan</b>
          <div className={s.topActions}>
            <button className={s.textButton} disabled>
              Use sample data
            </button>
            <button className={s.textButton} disabled>
              Sign out
            </button>
          </div>
        </header>
        <div className={s.main}>
          <section className={s.question}>
            <p className={s.step}>Step 1 of 5</p>
            <h1>What do you plan for?</h1>
            <p className={s.description}>
              Kriyan sorts everything into areas. These three are a starting point;
              rename them, remove them, or add your own.
            </p>
            <div className={s.answers} role="status" aria-label="Loading setup">
              <div className={s.skeleton} />
              <div className={s.skeleton} />
              <div className={s.skeleton} />
            </div>
            <footer className={s.footer}>
              <button className={s.primary} disabled>
                Continue
              </button>
            </footer>
          </section>
          <aside className={s.preview} aria-hidden="true" inert>
            <p className={s.caption}>Your planner so far</p>
            <div className={s.previewInner}>
              <div className={s.skeleton} />
              <div className={s.skeleton} />
              <div className={s.skeleton} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
