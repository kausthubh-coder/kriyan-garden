import { relativeDay } from "@kriyan/core";
import { timeOf, layout } from "@kriyan/core";
import { Check } from "./Check";
import { taskKeys } from "./Tray";
import {
  areaColor,
  projectName,
  type Area,
  type Goal,
  type Project,
  type Task,
  type PanelSection,
  type Variables,
} from "./types";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import s from "./App.module.css";
export interface Block {
  task?: Task;
  event?: Doc<"events">;
  start: number;
  end: number;
  column: number;
  columns: number;
}
export function TimelineBlock({
  block,
  startHour,
  endHour,
  areas,
  projects,
  goals,
  today,
  open,
  toggle,
}: {
  block: Block;
  startHour: number;
  endHour: number;
  areas: Area[];
  projects: Project[];
  goals: Goal[];
  today: string;
  open: (task: Task, section?: PanelSection) => void;
  toggle: (task: Task) => void;
}) {
  const { task, event, start, end, column, columns } = block;
  const duration = task ? task.durationMinutes : end - start;
  const visibleStart = Math.max(start, startHour * 60);
  const visibleEnd = Math.min(end, endHour * 60);
  const height = duration
    ? Math.max(((visibleEnd - visibleStart) / 60) * layout.hourHeight - 3, 30)
    : 30;
  const area = areas.find(
    (area) => area._id === (task?.areaId ?? event?.areaId),
  );
  const style: Variables = {
    "--c": areaColor(area),
    "--bc": areaColor(area),
    top: `calc(${(visibleStart - startHour * 60) / 60} * var(--hh) + 1px)`,
    height: duration
      ? `max(calc(${(visibleEnd - visibleStart) / 60} * var(--hh) - 3px), 30px)`
      : 30,
    left: `calc(${(column / columns) * 100}% + ${column ? 2 : 0}px)`,
    width: `calc(${100 / columns}% - ${columns > 1 ? 4 : 0}px)`,
  };
  if (event)
    return (
      <div
        className={`${s.blk} ${s.ev} ${height < 46 ? s.sm : ""}`}
        style={style}
      >
        <i className={s.dot} />
        <div className={s.tx}>
          <b>{event.title}</b>
          <span>
            Class or meeting{event.location ? `, ${event.location}` : ""}
          </span>
        </div>
        <time>
          {event.startTime}
          {columns === 1 ? ` to ${event.endTime}` : ""}
        </time>
      </div>
    );
  if (!task) return null;
  const goal = goals.find((goal) => goal._id === task.goalId);
  const sub =
    task.deadline && task.status === "active"
      ? `Due ${relativeDay(task.deadline, today)}`
      : goal
        ? `Goal: ${goal.title}`
        : projectName(task, projects, areas);
  return (
    <div
      data-task={task._id}
      data-drag="move"
      className={`${s.blk} ${duration === null ? s.pt : ""} ${height < 46 ? s.sm : ""} ${task.status === "completed" ? s.isdone : ""}`}
      style={style}
      tabIndex={0}
      role="group"
      aria-label={`${task.title}, ${task.time}${duration ? ` to ${timeOf(end)}` : ", no length"}`}
      onClick={() => open(task)}
      onKeyDown={(event) => taskKeys(event, task, open)}
    >
      <Check task={task} toggle={toggle} />
      <div className={s.tx}>
        <b>{task.title}</b>
        <span>{sub}</span>
      </div>
      <time>
        {task.time}
        {duration && columns === 1 ? ` to ${timeOf(end)}` : ""}
      </time>
      <i
        className={s.rz}
        data-resize="true"
        aria-hidden="true"
        title="Drag to change the length. Press L for length options."
      />
    </div>
  );
}
