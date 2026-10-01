"use client";
import { Suspense, useState, useSyncExternalStore } from "react";
import { AppShell } from "../app/AppShell";
import { PlannerDataContext, type PlannerDataAccess } from "../app/dataAccess";
import { useClock } from "../app/usePlanner";
import { createDemoStore } from "./store";
import { selectTask } from "../app/taskSelection";
import { appHref } from "@/lib/origins";
import s from "./Demo.module.css";

export function Demo() {
  const clock = useClock();
  return (
    <div className={s.demo}>
      <div className={s.bar}>
        <span>Demo with sample data. Nothing is saved.</span>
        <a href={appHref("/sign-up")}>Sign up</a>
      </div>
      {clock ? (
        <MemoryPlanner today={clock.today} />
      ) : (
        <p className={s.loading} role="status">
          Loading the sample day.
        </p>
      )}
    </div>
  );
}
function MemoryPlanner({ today }: { today: string }) {
  const [store] = useState(() => createDemoStore(today));
  const [access] = useState<PlannerDataAccess>(() => ({
    usePlanner(date) {
      const state = useSyncExternalStore(
          store.subscribe,
          store.snapshot,
          store.snapshot,
        ),
        clock = useClock();
      const [hintDismissed, dismissHint] = useState(false);
      return {
        ...state,
        goals: state.goals.map((g) => ({
          ...g,
          milestones: [...g.milestones].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
          linkedTasks: {
            total: state.tasks.filter((t) => t.goalId === g._id).length,
            done: state.tasks.filter(
              (t) => t.goalId === g._id && t.status === "completed",
            ).length,
          },
        })),
        clock: clock ? { ...clock, minutes: 11 * 60 + 45 } : null,
        habits: [],
        day: store.day(date ?? today),
        week: store.week(date ?? today),
        connected: true,
        loading: false,
        showSkeleton: false,
        error: "",
        retry: () => {},
        firstTaskAdded: true,
        hintDismissed,
        dismissHint: () => dismissHint(true),
      };
    },
    useTasks: () => store.tasks,
    useGoals: () => store.goals,
    useSelectedTask(key) {
      const state = useSyncExternalStore(
        store.subscribe,
        store.snapshot,
        store.snapshot,
      );
      return selectTask(key, state.tasks);
    },
    useSelectedGoal(key) {
      useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
      return store.selectedGoal(key);
    },
  }));
  return (
    <PlannerDataContext.Provider value={access}>
      <div className={s.planner}>
        <Suspense fallback={<p role="status">Loading the sample day.</p>}>
          <AppShell demo />
        </Suspense>
      </div>
    </PlannerDataContext.Provider>
  );
}
