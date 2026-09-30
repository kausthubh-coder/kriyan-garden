import s from "./App.module.css";

/** An independent layer keeps the timeline still while unknown task counts load. */
export function DaySkeleton({
  startHour,
  endHour,
}: {
  startHour: number;
  endHour: number;
}) {
  const cards = Array.from({ length: 3 }, (_, index) => (
    <div key={index} className={`${s.item} ${s["loading-card"]} ${s.skeleton}`}>
      <span />
      <b>Task title</b>
      <span />
      <small>Project or course</small>
    </div>
  ));
  return (
    <div className={s["loading-layout"]} aria-hidden="true">
      <aside className={s.tray}>
        <div className={`${s.filters} ${s.skeleton}`} />
        <section>
          <h2 className={s.h}>
            <span className={s.skeleton} />
          </h2>
          {cards}
        </section>
        <section className={s.later}>{cards}</section>
      </aside>
      <main className={s.day}>
        <header className={s.dh}>
          <span className={s.skeleton} />
        </header>
        <div
          className={s.grid}
          style={{ height: `calc(${endHour - startHour} * var(--hh))` }}
        >
          <div
            className={s.skeleton}
            style={{
              position: "absolute",
              top: "calc(3 * var(--hh))",
              width: "100%",
            }}
          />
          <div
            className={s.skeleton}
            style={{
              position: "absolute",
              top: "calc(6 * var(--hh))",
              width: "100%",
            }}
          />
        </div>
      </main>
      <aside className={s.side}>
        <div className={s.skeleton} />
        <div className={s.skeleton} />
        <div className={s.skeleton} />
      </aside>
    </div>
  );
}
