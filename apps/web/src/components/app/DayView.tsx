"use client";
import { useEffect, useRef } from "react";
import { daySummary, layout, plannedMinutes, plannerCopy } from "@kriyan/core";
import { Tray } from "./Tray";
import { Timeline } from "./Timeline";
import { SideRail } from "./SideRail";
import { DaySkeleton } from "./DaySkeleton";
import { DateHeader } from "./ViewParts";
import { useDrag } from "./useDrag";
import {
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
  navigate,
  goDay,
  goGoals,
  write,
  loading,
  firstRun = false,
  hint,
  dismissHint,
  addGoal,
  settings,
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
  add: (text?: string) => void;
  navigate: (offset: number) => void;
  goDay: (date: string) => void;
  goGoals: () => void;
  write: (task: Task, patch: TaskPatch, message: string) => void;
  loading: boolean;
  firstRun?: boolean;
  hint?: boolean;
  dismissHint?: () => void;
  addGoal?: () => void;
  settings?: () => void;
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
        hint={hint}
        dismissHint={dismissHint}
      />
      <main ref={scroll} className={s.day} data-day-scroll="true">
        <DateHeader
          date={date}
          today={today}
          navigate={navigate}
          settings={settings}
          summary={
            !day || loading
              ? "Loading your day."
              : !all.length ? (filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : firstRun ? plannerCopy.firstDay : plannerCopy.emptyDay) : daySummary({
                  left: active.length,
                  total: all.length,
                  plannedMinutes: planned,
                  withoutLength: noLength,
                })
          }
          phoneSummary={
            !day || loading
              ? "Loading your day."
              : !all.length ? (filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : firstRun ? plannerCopy.firstDay : plannerCopy.emptyDay) : daySummary({
                  left: active.length,
                  total: all.length,
                  plannedMinutes: planned,
                  withoutLength: 0,
                })
          }
        />
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
          firstRun={firstRun}
          add={add}
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
        addGoal={addGoal}
      />
    </div>
  );
}
