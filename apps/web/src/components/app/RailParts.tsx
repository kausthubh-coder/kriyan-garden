import type { ReactNode } from "react";
import { addDays, weekdayName, weekStart, formatMinutes, shortDate } from "@kriyan/core";
import { areaColor, type Area, type Task, type Week, type Variables } from "./types";
import s from "./App.module.css";

export function WeekLoadChart({week, areas, date, capacity, filter = "all", goDay, barHeight = 66}: {week?: Week; areas: Area[]; date: string; capacity: number; filter?: string; goDay?: (date: string) => void; barHeight?: number}) {
  const start = weekStart(date);
  const hasHours = week?.some((day) => Object.entries(day.plannedMinutesByArea).some(([areaId, minutes]) => (filter === "all" || areaId === filter) && minutes > 0));
  return (
            <div className={`${s.load} ${!hasHours ? s.emptyLoad : ""}`}>
              {Array.from({ length: 7 }, (_, index) => {
                const day = week?.[index],
                  dayDate = addDays(start, index),
                  total = day?.plannedMinutes ?? 0;
                const height = Math.round(Math.min(total / 480, 1) * barHeight);
                const loadLabel = total
                  ? formatMinutes(total)
                  : day?.taskCount
                    ? `${day.taskCount} ${day.taskCount === 1 ? "task" : "tasks"}`
                    : "";
                return (
                  <LoadDay
                    key={dayDate}
                    day={dayDate}
                    goDay={goDay}
                    className={dayDate === date ? s.t : ""}
                    aria-label={`${weekdayName(dayDate)[0]} ${loadLabel}, ${weekdayName(dayDate)}${total > capacity ? ", over capacity" : ""}`}
                  >
                    <i style={{ height }}>
                      {areas
                        .filter((area) => filter === "all" || area._id === filter)
                        .map((area) => (
                          <u
                            key={area._id}
                            style={{
                              height: `${total ? ((day?.plannedMinutesByArea[area._id] ?? 0) / total) * 100 : 0}%`,
                              background: areaColor(area),
                            }}
                          />
                        ))}
                    </i>
                    {weekdayName(dayDate)[0]} {hasHours && <small>{loadLabel}</small>}
                  </LoadDay>
                );
              })}
            </div>
  );
}
function LoadDay({day, goDay, children, className, "aria-label": label}: {day: string; goDay?: (date: string) => void; children: ReactNode; className?: string; "aria-label": string}) {
 return goDay ? <button className={className} onClick={() => goDay(day)} aria-label={label}>{children}</button> : <div className={className}>{children}</div>;
}
export function DeadlineRow({task, areas, free, open}: {task: Task; areas: Area[]; free: number; open?: (task: Task) => void}) {
 const needed = task.durationMinutes, spare = needed === null ? null : free - needed;
 return (
              <div
                className={s.dl}
                style={
                  {
                    "--c":
                      spare !== null && spare < 0
                        ? "var(--hot)"
                        : areaColor(
                            areas.find((area) => area._id === task.areaId),
                          ),
                    "--need":
                      needed === null
                        ? 0
                        : free
                          ? Math.min((needed / free) * 100, 100)
                          : 100,
                  } as Variables
                }
              >
                <div className={s.top}>
                  <i
                    className={s.dot}
                    style={
                      {
                        "--c": areaColor(
                          areas.find((area) => area._id === task.areaId),
                        ),
                      } as Variables
                    }
                  />
                  {open ? <button onClick={() => open(task)}>{task.title}</button> : <span className={s.deadlineTitle}>{task.title}</span>}
                  <span>{task.deadline ? shortDate(task.deadline) : "No date yet"}</span>
                </div>
                <div className={s.cush}>
                  <i />
                </div>
                <p>
                  {needed === null
                    ? "Length not set"
                    : `${formatMinutes(needed)} needed`}
                  , {formatMinutes(free)} free
                  {spare !== null && (
                    <b className={spare < 0 ? s.bad : undefined}>
                      {formatMinutes(Math.abs(spare))}{" "}
                      {spare < 0 ? "short" : "to spare"}
                    </b>
                  )}
                </p>
                {task.durationMinutes === null && (
                  <p>Add a length to compare time needed with time free.</p>
                )}
              </div> );
}
