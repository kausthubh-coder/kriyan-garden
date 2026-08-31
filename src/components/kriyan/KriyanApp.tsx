"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Task, TaskDraft, TaskPatch } from "@/lib/types";
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
  const [isPending, startTransition] = useTransition();

  if (data === undefined) return <main className="route-state">opening your garden</main>;

  const { regions, tasks } = data;
  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null;
  const taskCounts = new Map<string, number>();
  for (const task of tasks) {
    if (task.regionId) taskCounts.set(task.regionId, (taskCounts.get(task.regionId) ?? 0) + 1);
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1100);
  }

  async function handleUpdate(id: string, patch: TaskPatch) {
    await updateTask({
      id: id as Id<"tasks">,
      patch: {
        ...patch,
        regionId: patch.regionId === undefined ? undefined : patch.regionId as Id<"regions"> | null,
      },
    });
    flash("saved");
  }

  async function handleComplete(id: string, completed: boolean) {
    await completeTask({ id: id as Id<"tasks">, completed });
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
          flash(error instanceof Error ? error.message : "could not save");
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

  if (activeTask) {
    return <TaskEditor task={activeTask as Task} regions={regions} onBack={() => setActiveTaskId(null)} onUpdate={handleUpdate} onComplete={handleComplete} />;
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
      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
    </div>
  );
}
