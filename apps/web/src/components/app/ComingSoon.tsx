import s from "./App.module.css";
export function ComingSoon({
  title,
  goDay,
}: {
  title: string;
  goDay: () => void;
}) {
  return (
    <main className={s.page}>
      <header className={s.dh}>
        <h1>{title}</h1>
      </header>
      <div className={s.empty}>
        Coming soon. <button onClick={goDay}>View day</button>
      </div>
    </main>
  );
}
