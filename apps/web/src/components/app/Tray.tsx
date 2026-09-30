import { formatMinutes } from "@kriyan/core";
import { Check } from "./Check";
import { Filters } from "./Filters";
import {
  areaColor,
  dayName,
  projectName,
  relativeDate,
  type Area,
  type Project,
  type Task,
  type PanelSection,
  type Variables,
} from "./types";
import s from "./App.module.css";
export function taskKeys(
  event: React.KeyboardEvent,
  task: Task,
  open: (task: Task, section?: PanelSection) => void,
) {
  if (
    event.target !== event.currentTarget ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (["Enter", " ", "m", "M", "l", "L"].includes(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    open(
      task,
      event.key.toLowerCase() === "m"
        ? "time"
        : event.key.toLowerCase() === "l"
          ? "length"
          : undefined,
    );
  }
}
export function Tray({
  anytime,
  unscheduled,
  date,
  today,
  areas,
  projects,
  filter,
  setFilter,
  open,
  toggle,
  add,
  loading,
}: {
  anytime: Task[];
  unscheduled: Task[];
  date: string;
  today: string;
  areas: Area[];
  projects: Project[];
  filter: string;
  setFilter: (value: string) => void;
  open: (task: Task, section?: PanelSection) => void;
  toggle: (task: Task) => void;
  add: () => void;
  loading: boolean;
}) {
  const card = (task: Task) => (
    <div
      key={task._id}
      data-task={task._id}
      data-drag="place"
      className={`${s.item} ${task.status === "completed" ? s.done : ""}`}
      style={
        {
          "--c": areaColor(areas.find((area) => area._id === task.areaId)),
        } as Variables
      }
      tabIndex={0}
      role="group"
      aria-label={task.title}
      onClick={() => open(task)}
      onKeyDown={(event) => taskKeys(event, task, open)}
    >
      <Check task={task} toggle={toggle} />
      <b>{task.title}</b>
      <span>
        {task.durationMinutes === null
          ? ""
          : formatMinutes(task.durationMinutes)}
      </span>
      <small>
        {task.deadline && task.status === "active" && (
          <i>Due {relativeDate(task.deadline, today)}</i>
        )}
        {projectName(task, projects, areas)}
      </small>
    </div>
  );
  return (
    <aside className={s.tray} aria-label="Tasks to schedule">
      <Filters areas={areas} filter={filter} onChange={setFilter} />
      <section>
        <h2 className={s.h}>
          {date === today ? "Any time today" : `Any time on ${dayName(date)}`}
          <em>
            {anytime.filter((task) => task.status === "active").length} left
          </em>
        </h2>
        {loading ? (
          <>
            <div className={s.skeleton} />
            <div className={s.skeleton} />
          </>
        ) : anytime.length ? (
          [...anytime]
            .sort(
              (a, b) =>
                Number(a.status === "completed") -
                Number(b.status === "completed"),
            )
            .map(card)
        ) : (
          <div className={s.empty}>
            Nothing waiting. <button onClick={add}>Add a task</button>
          </div>
        )}
      </section>
      <section className={s.later}>
        <h2 className={s.h}>
          No date yet<em>{unscheduled.length}</em>
        </h2>
        {loading ? (
          <div className={s.skeleton} />
        ) : unscheduled.length ? (
          unscheduled.map(card)
        ) : (
          <div className={s.empty}>
            Tasks without a date land here.{" "}
            <button onClick={add}>Add a task</button>
          </div>
        )}
        <p className={s.hint}>
          Drag a task onto the day to give it a time. A length is optional: drag
          the bottom edge of a block to set one.
        </p>
      </section>
    </aside>
  );
}
