"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Region, TaskDraft, TaskPatch } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { DistanceView } from "./DistanceView";
import { GardenHeader } from "./GardenHeader";
import { GardenView } from "./GardenView";
import { Onboarding } from "./Onboarding";
import { PlantComposer } from "./PlantComposer";
import { ReminderPanel } from "./ReminderPanel";
import { SpacesPanel } from "./SpacesPanel";
import { TaskEditor } from "./TaskEditor";
import styles from "./kriyan.module.css";

export type ViewName = "garden" | "distance" | "calendar";

function errorMessage(error: unknown) {
  // Convex wraps server failures in transport detail that is not worth showing.
  if (!(error instanceof Error) || !error.message || error.message.includes("[CONVEX")) return "could not save";
  return error.message;
}

function ActiveTask({ id, regions, onBack, onUpdate, onComplete }: { id: string; regions: Region[]; onBack: () => void; onUpdate: (id: string, patch: TaskPatch) => Promise<void>; onComplete: (id: string, completed: boolean) => Promise<void> }) {
  const task = useQuery(api.garden.getTask, { id: id as Id<"tasks"> });
  const missing = task === null;
  useEffect(() => {
    if (missing) onBack();
  }, [missing, onBack]);
  if (!task) return <main className="route-state">opening the page</main>;
  return <TaskEditor key={task.id} task={task} regions={regions} onBack={onBack} onUpdate={onUpdate} onComplete={onComplete} />;
}

export function KriyanApp() {
  const data = useQuery(api.garden.get);
  const completeOnboarding = useMutation(api.garden.completeOnboarding);
  const exploreDemo = useMutation(api.garden.exploreDemo);
  const restartOnboarding = useMutation(api.garden.restartOnboarding);
  const createRegion = useMutation(api.garden.createRegion);
  const renameRegion = useMutation(api.garden.renameRegion);
  const removeRegion = useMutation(api.garden.removeRegion);
  const createTask = useMutation(api.garden.createTask);
  const updateTask = useMutation(api.garden.updateTask);
  const completeTask = useMutation(api.garden.completeTask);
  const [view, setView] = useState<ViewName>("garden");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskSeed, setNewTaskSeed] = useState<{ date?: string | null; regionId?: string | null } | null>(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);
  const closeTask = useCallback(() => setActiveTaskId(null), []);
  const [isPending, startTransition] = useTransition();

  if (data === undefined) return <main className="route-state">opening your garden</main>;

  const { regions, tasks } = data;
  const taskCounts = new Map<string, number>();
  for (const task of tasks) {
    if (task.regionId) taskCounts.set(task.regionId, (taskCounts.get(task.regionId) ?? 0) + 1);
  }

  function flash(message: string, duration = 1100) {
    window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(""), duration);
  }

  function flashError(error: unknown) {
    flash(errorMessage(error), 4000);
  }

  async function handleUpdate(id: string, patch: TaskPatch) {
    try {
      await updateTask({
        id: id as Id<"tasks">,
        patch: {
          ...patch,
          regionId: patch.regionId === undefined ? undefined : patch.regionId as Id<"regions"> | null,
        },
      });
      flash("saved");
    } catch (error) {
      flashError(error);
    }
  }

  async function handleComplete(id: string, completed: boolean) {
    try {
      await completeTask({ id: id as Id<"tasks">, completed });
    } catch (error) {
      flashError(error);
      return;
    }
    if (completed) {
      flash("lifted from the bed");
      window.setTimeout(() => setActiveTaskId(null), 650);
    }
  }

  async function handlePlant(draft: TaskDraft) {
    const created = await createTask({
      title: draft.title,
      regionId: draft.regionId as Id<"regions"> | null,
      dueDate: draft.dueDate ?? null,
      time: draft.time ?? null,
      durationMinutes: draft.durationMinutes ?? null,
      repeatRule: draft.repeatRule ?? null,
      reminders: draft.reminders ?? [],
      content: draft.content ?? "",
    });
    setNewTaskSeed(null);
    setActiveTaskId(created.id);
  }

  function run(work: () => Promise<unknown>, success?: string) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await work();
          if (success) flash(success);
          resolve();
        } catch (error) {
          flashError(error);
          reject(error);
        }
      });
    });
  }

  if (!data.onboardingComplete) {
    return (
      <Onboarding
        onComplete={(names) => run(() => completeOnboarding({ names }))}
        onDemo={() => run(() => exploreDemo({}))}
      />
    );
  }

  if (newTaskSeed) {
    return <PlantComposer regions={regions} initialDate={newTaskSeed.date} initialRegionId={newTaskSeed.regionId} onCancel={() => setNewTaskSeed(null)} onPlant={handlePlant} />;
  }

  const noticeBanner = notice ? <div className={styles.notice} role="status">{notice}</div> : null;

  if (activeTaskId) {
    return (
      <>
        <ActiveTask id={activeTaskId} regions={regions} onBack={closeTask} onUpdate={handleUpdate} onComplete={handleComplete} />
        {noticeBanner}
      </>
    );
  }

  return (
    <div className={styles.appShell} aria-busy={isPending}>
      <GardenHeader view={view} onView={setView} onAdd={() => setNewTaskSeed({})} onRemind={() => setRemindersOpen(true)} />
      {view === "garden" ? <GardenView regions={regions} tasks={tasks} onOpen={setActiveTaskId} onManageSpaces={() => setSpacesOpen(true)} /> : null}
      {view === "distance" ? <DistanceView regions={regions} tasks={tasks} onOpen={setActiveTaskId} /> : null}
      {view === "calendar" ? <CalendarView regions={regions} tasks={tasks} onOpen={setActiveTaskId} onPlant={(date) => setNewTaskSeed({ date })} /> : null}
      {remindersOpen ? <ReminderPanel tasks={tasks} regions={regions} onClose={() => setRemindersOpen(false)} onOpen={(id) => { setRemindersOpen(false); setActiveTaskId(id); }} /> : null}
      {spacesOpen ? (
        <SpacesPanel
          regions={regions}
          taskCounts={taskCounts}
          onClose={() => setSpacesOpen(false)}
          onCreate={(name) => run(() => createRegion({ name }), `${name} added`)}
          onRename={(id, name) => run(() => renameRegion({ id: id as Id<"regions">, name }), "space renamed")}
          onDelete={(id) => run(() => removeRegion({ id: id as Id<"regions"> }), "space removed")}
          onReset={async () => { setSpacesOpen(false); await run(() => restartOnboarding({})); }}
        />
      ) : null}
      {noticeBanner}
    </div>
  );
}
