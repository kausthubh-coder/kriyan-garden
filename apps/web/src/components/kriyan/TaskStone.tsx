import type { CSSProperties } from "react";
import type { Region, TaskSummary } from "@/lib/types";
import styles from "./kriyan.module.css";

type AccentStyle = CSSProperties & { "--accent": string };

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function taskMeta(task: TaskSummary, today: string) {
  const pieces: string[] = [];
  if (task.dueDate) pieces.push(task.dueDate === today ? "today" : shortDate(task.dueDate));
  if (task.durationMinutes) pieces.push(`${task.durationMinutes} min`);
  if (task.time) pieces.push(task.time);
  return pieces.join(" · ");
}

export function TaskStone({ task, region, today, onOpen, compact = false }: { task: TaskSummary; region?: Region; today: string; onOpen: (id: string) => void; compact?: boolean }) {
  const accent = region?.color ?? "#8e8a7d";
  const meta = taskMeta(task, today);
  return (
    <button
      className={`${styles.stone} ${compact ? styles.stoneCompact : ""}`}
      style={{ "--accent": accent } as AccentStyle}
      onClick={() => onOpen(task.id)}
      type="button"
    >
      <span className={styles.stoneAccent} aria-hidden="true" />
      <span className={styles.stoneCopy}>
        <strong>{task.title}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </button>
  );
}
