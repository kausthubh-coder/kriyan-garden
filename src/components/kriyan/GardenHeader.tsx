import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import type { ViewName } from "@/components/kriyan/KriyanApp";
import styles from "./kriyan.module.css";

const views: Array<{ id: ViewName; label: string }> = [
  { id: "garden", label: "garden" },
  { id: "distance", label: "distance" },
  { id: "calendar", label: "calendar" },
];

export function GardenHeader({ view, onView, onAdd, onRemind }: { view: ViewName; onView: (view: ViewName) => void; onAdd: () => void; onRemind: () => void }) {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} href="/">kriyan</Link>
      <nav className={styles.viewNav} aria-label="Views">
        {views.map((item) => (
          <button key={item.id} aria-pressed={view === item.id} className={view === item.id ? styles.activeNav : ""} onClick={() => onView(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <button className={styles.addTodoButton} onClick={onAdd} type="button"><Plus size={16} weight="thin" />add todo</button>
        <button onClick={onRemind} type="button">remind</button>
        <time suppressHydrationWarning dateTime={new Date().toISOString().slice(0, 10)}>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</time>
      </div>
    </header>
  );
}
