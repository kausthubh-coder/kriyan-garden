import type { Task } from "./types";
import s from "./App.module.css";
export function Check({
  task,
  toggle,
}: {
  task: Task;
  toggle: (task: Task) => void;
}) {
  const done = task.status === "completed";
  return (
    <button
      className={`${s.chk} ${done ? s.is : ""}`}
      role="checkbox"
      aria-checked={done}
      aria-label={`${done ? "Mark as not done" : "Mark as done"}: ${task.title}`}
      onClick={(event) => {
        event.stopPropagation();
        toggle(task);
      }}
    />
  );
}
