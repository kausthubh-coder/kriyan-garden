import { formatMinutes, plannedMinutes } from "@kriyan/core";
import { Filters } from "./Filters";
import { Icon } from "./Icon";
import {
  DateHeader,
  TaskRow,
  ViewSkeleton,
  sortTasks,
  type ViewProps,
} from "./ViewParts";
import { areaColor, relativeDate, type Variables } from "./types";
import s from "./App.module.css";
export function ListView(p: ViewProps) {
  const shown = p.tasks.filter(
    (t) => p.filter === "all" || t.areaId === p.filter,
  );
  const dated = shown.filter((t) => t.date === p.date),
    later = shown.filter((t) => !t.date && t.status === "active");
  const active = dated.filter((t) => t.status === "active"),
    minutes = plannedMinutes(dated),
    noLength = active.filter((t) => t.durationMinutes === null).length;
  const summary = p.loading
    ? "Loading your day."
    : dated.length
      ? `${active.length} ${active.length === 1 ? "task" : "tasks"} left${minutes ? `, ${formatMinutes(minutes)} planned` : ""}${noLength ? `, ${noLength} with no length` : ""}.`
      : "Nothing planned.";
  return (
    <main className={s.page}>
      <DateHeader {...p} summary={summary} />
      <div className={s.col}>
        <Filters areas={p.areas} filter={p.filter} onChange={p.setFilter} />
        <button className={s.addrow} onClick={p.add}>
          <Icon name="plus" />
          <span>
            Add a task, for example &quot;econ outline fri 5pm #econ 45m&quot;
          </span>
          <i className={`${s.kbd} ${s["only-d"]}`}>N</i>
        </button>
        {p.loading ? (
          <ViewSkeleton kind="list" />
        ) : (
          <>
            {p.areas
              .filter((a) => p.filter === "all" || a._id === p.filter)
              .map((a) => {
                const tasks = dated
                    .filter((t) => t.areaId === a._id)
                    .sort(sortTasks),
                  minutes = plannedMinutes(tasks);
                return tasks.length ? (
                  <section
                    className={s.sec}
                    key={a._id}
                    style={{ "--c": areaColor(a) } as Variables}
                  >
                    <h2>
                      <i className={s.dot} />
                      {a.name}
                      <em>
                        {tasks.filter((t) => t.status === "active").length} left
                        {minutes ? `, ${formatMinutes(minutes)}` : ""}
                      </em>
                    </h2>
                    {tasks.map((task) => (
                      <TaskRow {...p} task={task} key={task._id} />
                    ))}
                  </section>
                ) : null;
              })}
            {!dated.length && (
              <div className={s.empty}>
                Nothing planned for{" "}
                {relativeDate(p.date, p.today).toLowerCase()}.{" "}
                <button onClick={p.add}>Add task</button>
              </div>
            )}
            {later.length > 0 && (
              <section className={s.sec}>
                <h2>
                  No date yet<em>{later.length}</em>
                </h2>
                {later.sort(sortTasks).map((task) => (
                  <TaskRow {...p} task={task} key={task._id} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
