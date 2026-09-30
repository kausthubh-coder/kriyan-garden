import { weekdayName, longDate } from "@kriyan/core";
import { addDays, formatMinutes, weekStart } from "@kriyan/core";
import { Filters } from "./Filters";
import { SideRail } from "./SideRail";
import { taskKeys } from "./Tray";
import { ViewHeader, ViewSkeleton, type ViewProps } from "./ViewParts";
import { areaColor, type Variables, type Week } from "./types";
import s from "./App.module.css";
export function WeekView(
  p: ViewProps & {
    week?: Week;
    capacity: number;
    goDay: (date: string) => void;
    goGoals: () => void;
  },
) {
  const start = weekStart(p.date);
  return (
    <main className={s.page}>
      <ViewHeader
        title="Week"
        unit="week"
        subtitle={`${longDate(start)} to ${longDate(addDays(start, 6))}`}
        phoneDate={`${longDate(start)} to ${longDate(addDays(start, 6))}`}
        summary={`${formatMinutes(p.week?.reduce((sum, day) => sum + day.plannedMinutes, 0) ?? 0)} planned.`}
        navigate={(offset) => p.navigate(offset * 7)}
      />
      <Filters areas={p.areas} filter={p.filter} onChange={p.setFilter} />
      {p.loading ? (
        <ViewSkeleton kind="week" />
      ) : (
        <div className={s.week}>
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(start, i),
              day = p.week?.[i];
            const tasks = [
              ...(day?.timed ?? []),
              ...(day?.anytime ?? []),
            ].filter((t) => p.filter === "all" || t.areaId === p.filter);
            const events = (day?.events ?? []).filter(
              (e) => p.filter === "all" || e.areaId === p.filter,
            );
            const entries = [
              ...tasks.map((task) => ({
                key: task._id,
                time: task.time ?? "99",
                task,
                event: null,
              })),
              ...events.map((event) => ({
                key: event._id,
                time: event.startTime,
                task: null,
                event,
              })),
            ].sort((a, b) => a.time.localeCompare(b.time));
            return (
              <section
                className={`${s.wd} ${date === p.today ? s.t : ""}`}
                key={date}
              >
                <button
                  onClick={() => p.goDay(date)}
                  aria-label={`Open ${weekdayName(date)}, ${longDate(date)}`}
                >
                  {weekdayName(date).slice(0, 3)}
                  <em>{Number(date.slice(-2))}</em>
                  <span
                    className={
                      (day?.plannedMinutes ?? 0) > p.capacity ? s.bad : ""
                    }
                  >
                    {day?.plannedMinutes
                      ? formatMinutes(day.plannedMinutes)
                      : ""}
                    {(day?.plannedMinutes ?? 0) > p.capacity ? ", over" : ""}
                  </span>
                </button>
                {entries.map(({ key, task, event }) =>
                  task ? (
                    <button
                      key={key}
                      className={`${s.wt} ${task.status === "completed" ? s.done : ""}`}
                      onClick={() => p.open(task)}
                      onKeyDown={(e) => taskKeys(e, task, p.open)}
                      style={
                        {
                          "--c": areaColor(
                            p.areas.find((a) => a._id === task.areaId),
                          ),
                        } as Variables
                      }
                    >
                      <i className={s.dot} />
                      <span>
                        {task.title}
                        <small>
                          {task.time ?? "Any time"}
                          {task.durationMinutes !== null
                            ? `, ${formatMinutes(task.durationMinutes)}`
                            : ""}
                        </small>
                      </span>
                    </button>
                  ) : (
                    event && (
                      <div
                        key={key}
                        className={`${s.wt} ${s.ev}`}
                        style={
                          {
                            "--c": areaColor(
                              p.areas.find((a) => a._id === event.areaId),
                            ),
                          } as Variables
                        }
                      >
                        <i className={s.dot} />
                        <span>
                          {event.title}
                          <small>
                            {event.startTime} to {event.endTime}
                          </small>
                        </span>
                      </div>
                    )
                  ),
                )}
              </section>
            );
          })}
        </div>
      )}
      {!p.loading &&
        !p.week?.some((d) =>
          [...d.timed, ...d.anytime, ...d.events].some(
            (t) => p.filter === "all" || t.areaId === p.filter,
          ),
        ) && (
          <div className={s.empty}>
            Nothing planned this week. <button onClick={p.add}>Add task</button>
          </div>
        )}
      <div className={s.weekSummary}>
        <SideRail {...p} loading={p.loading} compact />
      </div>
    </main>
  );
}
