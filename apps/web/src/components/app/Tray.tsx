import { weekdayName, relativeDay } from "@kriyan/core";
import { formatMinutes } from "@kriyan/core";
import { Check } from "./Check";
import { Filters } from "./Filters";
import {
  areaColor,
  projectName,
  type Area,
  type Project,
  type Task,
  type PanelSection,
  type Variables,
} from "./types";
import s from "./App.module.css";
import { Icon } from "./Icon";
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
  hint,
  dismissHint,
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
  hint?: boolean;
  dismissHint?: () => void;
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
          <i>Due {relativeDay(task.deadline, today)}</i>
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
          {date === today
            ? "Any time today"
            : `Any time on ${weekdayName(date)}`}
          {anytime.length > 0 && <em>
            {anytime.filter((task) => task.status === "active").length} left
          </em>}
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
          <p className={s.empty}>{filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : "Tasks for today without a time wait here."}</p>
        )}
        <button className={s.trayAdd} onClick={add}><Icon name="plus" />Add a task<span className={s.kbd}>N</span></button>
        {hint && anytime.length > 0 && <div className={s.trayHint}>
          <span className={s.fineHint}>Drag a task from the tray onto the timeline to give it a time.</span>
          <span className={s.touchHint}>Tap a task to give it a time.</span>
          <button className={s.hintDismiss} onClick={dismissHint}>Got it</button>
        </div>}
      </section>
      <section className={s.later}>
        <h2 className={s.h}>
          No date yet{unscheduled.length > 0 && <em>{unscheduled.length}</em>}
        </h2>
        {loading ? (
          <div className={s.skeleton} />
        ) : unscheduled.length ? (
          unscheduled.map(card)
        ) : (
          <p className={s.empty}>{filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : "Tasks without a day land here until you schedule them."}</p>
        )}
        {hint && !anytime.length && unscheduled.length > 0 && <div className={s.trayHint}>
          <span className={s.fineHint}>Drag a task from the tray onto the timeline to give it a time.</span>
          <span className={s.touchHint}>Tap a task to give it a time.</span>
          <button className={s.hintDismiss} onClick={dismissHint}>Got it</button>
        </div>}
      </section>
    </aside>
  );
}
