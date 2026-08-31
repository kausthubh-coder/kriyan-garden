import type { CSSProperties } from "react";
import type { Region, Task } from "@/lib/types";
import styles from "./kriyan.module.css";

type AccentStyle = CSSProperties & { "--accent": string };

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function taskMeta(task: Task) {
  const pieces: string[] = [];
  if (task.dueDate) pieces.push(task.dueDate === "2026-08-24" ? "today" : shortDate(task.dueDate));
  if (task.durationMinutes) pieces.push(`${task.durationMinutes} min`);
  if (task.time) pieces.push(task.time);
  return pieces.join(" · ");
}

export function TaskStone({ task, region, onOpen, compact = false }: { task: Task; region?: Region; onOpen: (id: string) => void; compact?: boolean }) {
  const accent = region?.color ?? "#8e8a7d";
  const meta = taskMeta(task);
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
