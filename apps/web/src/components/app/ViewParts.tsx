import { formatMinutes } from "@kriyan/core";
import { Check } from "./Check";
import { taskKeys } from "./Tray";
import { Icon } from "./Icon";
import {
  areaColor,
  dayName,
  longDate,
  projectName,
  relativeDate,
  type Area,
  type Goal,
  type Project,
  type Task,
  type Variables,
  type PanelSection,
} from "./types";
import s from "./App.module.css";

export type ViewProps = {
  tasks: Task[];
  areas: Area[];
  projects: Project[];
  goals: Goal[];
  date: string;
  today: string;
  filter: string;
  loading: boolean;
  setFilter: (value: string) => void;
  open: (task: Task, section?: PanelSection) => void;
  toggle: (task: Task) => void;
  add: () => void;
  navigate: (offset: number) => void;
};
export const sortTasks = (a: Task, b: Task) =>
  Number(a.status === "completed") - Number(b.status === "completed") ||
  (a.time ?? "99").localeCompare(b.time ?? "99") ||
  a.sortOrder - b.sortOrder;
export function ViewHeader({
  title,
  subtitle,
  navigate,
  summary,
  unit = "day",
}: {
  title: string;
  subtitle?: string;
  navigate?: (offset: number) => void;
  summary?: string;
  unit?: "day" | "week";
}) {
  return (
    <header className={s.dh}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {summary && <p className={s.sum}>{summary}</p>}
      {navigate && (
        <div className={s.right}>
          <button
            className={`${s.f} ${s.ic}`}
            aria-label={`Previous ${unit}`}
            onClick={() => navigate(-1)}
          >
            <Icon name="prev" />
          </button>
          <button className={s.f} onClick={() => navigate(0)}>
            Today
          </button>
          <button
            className={`${s.f} ${s.ic}`}
            aria-label={`Next ${unit}`}
            onClick={() => navigate(1)}
          >
            <Icon name="next" />
          </button>
        </div>
      )}
    </header>
  );
}
export function DateHeader({
  date,
  today,
  navigate,
  summary,
}: Pick<ViewProps, "date" | "today" | "navigate"> & { summary?: string }) {
  return (
    <ViewHeader
      title={date === today ? "Today" : dayName(date)}
      subtitle={longDate(date)}
      navigate={navigate}
      summary={summary}
    />
  );
}
export function ViewSkeleton({ kind }: { kind: "list" | "week" | "goals" }) {
  return (
    <div
      aria-label={`Loading ${kind}`}
      role="status"
      className={kind === "week" ? s.week : s.col}
    >
      {Array.from({ length: kind === "week" ? 7 : 3 }, (_, i) => (
        <section className={kind === "week" ? s.wd : s.sec} key={i}>
          <div className={s.skeleton} />
          <div className={s.skeleton} />
          <div className={s.skeleton} />
        </section>
      ))}
    </div>
  );
}
export function TaskRow({
  task,
  areas,
  projects,
  goals,
  today,
  open,
  toggle,
  withDate = false,
}: Pick<
  ViewProps,
  "areas" | "projects" | "goals" | "today" | "open" | "toggle"
> & { task: Task; withDate?: boolean }) {
  const goal = goals.find((g) => g._id === task.goalId);
  return (
    <div
      className={`${s.row} ${task.status === "completed" ? s.done : ""}`}
      style={
        {
          "--c": areaColor(areas.find((a) => a._id === task.areaId)),
        } as Variables
      }
    >
      <Check task={task} toggle={toggle} />
      <button
        className={s.rowOpen}
        onClick={() => open(task)}
        onKeyDown={(e) => taskKeys(e, task, open)}
        aria-label={`Open task: ${task.title}`}
      >
        <span className={s.t}>{task.title}</span>
        <span className={s.meta}>
          {task.deadline && task.status === "active" && (
            <span className={s.due}>
              Due {relativeDate(task.deadline, today)}
            </span>
          )}
          {goal && <span className={s.gl}>{goal.title}</span>}
          <span>{projectName(task, projects, areas)}</span>
          {withDate && task.date && (
            <span>{relativeDate(task.date, today)}</span>
          )}
          {task.time && <span className={s.tm}>{task.time}</span>}
          {task.durationMinutes !== null && (
            <span>{formatMinutes(task.durationMinutes)}</span>
          )}
        </span>
      </button>
    </div>
  );
}
