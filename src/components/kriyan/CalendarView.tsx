"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { Region, Task } from "@/lib/types";
import { TaskStone } from "./TaskStone";
import styles from "./kriyan.module.css";

const dayMs = 86_400_000;
const now = new Date();
const weekday = now.getUTCDay() || 7;
const baseMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday + 1, 12));

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function CalendarView({ regions, tasks, onOpen, onPlant }: { regions: Region[]; tasks: Task[]; onOpen: (id: string) => void; onPlant: (date: string) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(baseMonday.getTime() + (weekOffset * 7 + index) * dayMs)), [weekOffset]);
  const regionMap = new Map(regions.map((region) => [region.id, region]));
  const first = days[0];
  const last = days[6];
  const rangeLabel = first.getUTCMonth() === last.getUTCMonth()
    ? `${first.toLocaleDateString("en", { month: "long", day: "numeric", timeZone: "UTC" })} – ${last.getUTCDate()}, ${last.getUTCFullYear()}`
    : `${first.toLocaleDateString("en", { month: "long", day: "numeric", timeZone: "UTC" })} – ${last.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}`;

  return (
    <main className={styles.calendarView}>
      <div className={styles.calendarHeading}>
        <div>
          <span>calendar</span>
          <h1>{rangeLabel}</h1>
        </div>
        <div className={styles.weekControls}>
          <button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Previous week"><CaretLeft size={17} weight="thin" /></button>
          <button type="button" onClick={() => setWeekOffset(0)}>this week</button>
          <button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Next week"><CaretRight size={17} weight="thin" /></button>
        </div>
      </div>
      <div className={styles.weekGrid}>
        {days.map((day) => {
          const date = isoDay(day);
          const dayTasks = tasks.filter((task) => task.status === "active" && task.dueDate === date);
          return (
            <section className={styles.dayColumn} key={date}>
              <button className={styles.dayHeading} type="button" onClick={() => onPlant(date)} title="Add a todo here">
                <span>{day.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}</span>
                <strong>{day.getUTCDate()}</strong>
              </button>
              <div className={styles.dayTasks}>
                {dayTasks.map((task) => <TaskStone key={task.id} task={task} region={task.regionId ? regionMap.get(task.regionId) : undefined} onOpen={onOpen} compact />)}
                {dayTasks.length === 0 ? <button className={styles.emptyDay} type="button" onClick={() => onPlant(date)}>add todo</button> : null}
              </div>
            </section>
          );
        })}
      </div>
      <p className={styles.undatedCount}>{tasks.filter((task) => task.status === "active" && !task.dueDate).length} todos have no date</p>
    </main>
  );
}
