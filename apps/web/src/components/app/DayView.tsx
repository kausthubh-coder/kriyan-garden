"use client";
import { useEffect, useRef } from "react";
import { formatMinutes, layout, plannedMinutes } from "@kriyan/core";
import { Tray } from "./Tray";
import { Timeline } from "./Timeline";
import { SideRail } from "./SideRail";
import { DaySkeleton } from "./DaySkeleton";
import { Icon } from "./Icon";
import { useDrag } from "./useDrag";
import {
  dayName,
  longDate,
  type Area,
  type Day,
  type Goal,
  type Profile,
  type Project,
  type Task,
  type Week,
  type PanelSection,
} from "./types";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import s from "./App.module.css";
export function DayView({
  day,
  week,
  tasks,
  goals,
  areas,
  projects,
  profile,
  date,
  today,
  now,
  filter,
  setFilter,
  open,
  toggle,
  add,
  palette,
  navigate,
  goDay,
  goGoals,
  write,
  loading,
}: {
  day?: Day;
  week?: Week;
  tasks: Task[];
  goals: Goal[];
  areas: Area[];
  projects: Project[];
  profile?: Profile;
  date: string;
  today: string;
  now: number;
  filter: string;
  setFilter: (value: string) => void;
  open: (task: Task, section?: PanelSection) => void;
  toggle: (task: Task) => void;
  add: () => void;
  palette: () => void;
  navigate: (offset: number) => void;
  goDay: (date: string) => void;
  goGoals: () => void;
  write: (task: Task, patch: TaskPatch, message: string) => void;
  loading: boolean;
}) {
  const startHour = profile?.dayStartHour ?? 7,
    endHour = profile?.dayEndHour ?? 23;
  const shown = (areaId: string | null) =>
    filter === "all" || areaId === filter;
  const filtered = day
    ? {
        ...day,
        timed: day.timed.filter((task) => shown(task.areaId)),
        anytime: day.anytime.filter((task) => shown(task.areaId)),
        unscheduled: day.unscheduled.filter((task) => shown(task.areaId)),
        events: day.events.filter((event) => shown(event.areaId)),
      }
    : undefined;
  const all = [...(filtered?.timed ?? []), ...(filtered?.anytime ?? [])],
    active = all.filter((task) => task.status === "active"),
    planned = plannedMinutes(all),
    noLength = active.filter((task) => task.durationMinutes === null).length;
  const drag = useDrag(tasks, date, startHour, endHour, write);
  const scroll = useRef<HTMLElement>(null);
  useEffect(() => {
    if (matchMedia("(max-width: 820px)").matches || !scroll.current) return;
    scroll.current.scrollTop =
      ((Math.max(9 * 60, Math.min(now, 20 * 60)) - startHour * 60) / 60) *
        layout.hourHeight -
      170;
    // Scroll once when the selected day or profile hours change, not on clock ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startHour]);
  return (
    <div className={s["view-day"]} data-loading={loading} {...drag}>
      {loading && <DaySkeleton startHour={startHour} endHour={endHour} />}
      <Tray
        anytime={filtered?.anytime ?? []}
        unscheduled={filtered?.unscheduled ?? []}
        date={date}
        today={today}
        areas={areas}
        projects={projects}
        filter={filter}
        setFilter={setFilter}
        open={open}
        toggle={toggle}
        add={add}
        loading={loading}
      />
      <main ref={scroll} className={s.day} data-day-scroll="true">
        <header className={s.dh}>
          <h1>{dayName(date)}</h1>
          <p>{longDate(date)}</p>
          <p className={s.sum}>
            {!day || loading ? (
              "Loading your day."
            ) : all.length ? (
              <>
                <b>
                  {active.length} {active.length === 1 ? "task" : "tasks"} left
                </b>
                {planned ? `, ${formatMinutes(planned)} planned` : ""}
                {noLength ? `, ${noLength} with no length` : ""}.
              </>
            ) : (
              "Nothing planned."
            )}
          </p>
          <div className={s.right}>
            <button
              className={`${s.f} ${s.ic}`}
              aria-label="Previous day"
              onClick={() => navigate(-1)}
            >
              <Icon name="prev" />
            </button>
            <button className={s.f} onClick={() => navigate(0)}>
              Today
            </button>
            <button
              className={`${s.f} ${s.ic}`}
              aria-label="Next day"
              onClick={() => navigate(1)}
            >
              <Icon name="next" />
            </button>
            <button className={`${s.f} ${s["only-d"]}`} onClick={palette}>
              Ctrl K
            </button>
          </div>
        </header>
        <Timeline
          day={filtered}
          startHour={startHour}
          endHour={endHour}
          date={date}
          today={today}
          now={now}
          areas={areas}
          projects={projects}
          goals={goals}
          open={open}
          toggle={toggle}
          loading={loading}
        />
      </main>
      <SideRail
        week={week}
        tasks={tasks}
        goals={goals}
        areas={areas}
        date={date}
        today={today}
        filter={filter}
        capacity={profile?.dailyCapacityMinutes ?? 360}
        goDay={goDay}
        goGoals={goGoals}
        open={open}
        loading={loading}
      />
    </div>
  );
}
