"use client";

import { useState, useTransition } from "react";
import { completeOnboarding, completeTask, createRegion, createTask, exploreDemoWorkspace, removeRegion, renameRegion, restartOnboarding, updateTask } from "@/app/actions";
import type { GardenData, Task, TaskDraft, TaskPatch } from "@/lib/types";
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

export function KriyanApp({ initialData }: { initialData: GardenData }) {
  const [onboardingComplete, setOnboardingComplete] = useState(initialData.onboardingComplete);
  const [regions, setRegions] = useState(initialData.regions);
  const [tasks, setTasks] = useState(initialData.tasks);
  const [view, setView] = useState<ViewName>("garden");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskSeed, setNewTaskSeed] = useState<{ date?: string | null; regionId?: string | null } | null>(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null;
  const taskCounts = new Map<string, number>();
  for (const task of tasks) {
    if (task.regionId) taskCounts.set(task.regionId, (taskCounts.get(task.regionId) ?? 0) + 1);
  }

  function applyGardenData(data: GardenData) {
    setRegions(data.regions);
    setTasks(data.tasks);
    setOnboardingComplete(data.onboardingComplete);
  }

  function replaceTask(next: Task) {
    setTasks((current) => current.map((task) => task.id === next.id ? next : task));
  }

  async function handleUpdate(id: string, patch: TaskPatch) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } as Task : task));
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          replaceTask(await updateTask(id, patch));
          setNotice("saved");
          window.setTimeout(() => setNotice(""), 900);
        } catch {
          setNotice("could not save");
        } finally {
          resolve();
        }
      });
    });
  }

  async function handleComplete(id: string, completed: boolean) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: completed ? "completed" : "active" } : task));
    startTransition(async () => {
      try {
        replaceTask(await completeTask(id, completed));
        if (completed) {
          setNotice("lifted from the bed");
          window.setTimeout(() => { setActiveTaskId(null); setNotice(""); }, 700);
        }
      } catch {
        setNotice("could not save");
      }
    });
  }

  async function handlePlant(draft: TaskDraft) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const created = await createTask(draft);
          setTasks((current) => [...current, created]);
          setNewTaskSeed(null);
          setActiveTaskId(created.id);
        } catch {
          setNotice("could not plant");
        } finally {
          resolve();
        }
      });
    });
  }

  async function handleOnboarding(names: string[]) {
    const data = await completeOnboarding(names);
    applyGardenData(data);
    return data;
  }

  async function handleDemo() {
    const data = await exploreDemoWorkspace();
    applyGardenData(data);
    return data;
  }

  async function handleCreateSpace(name: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const created = await createRegion(name);
          setRegions((current) => [...current, created]);
          setNotice(`${created.name} added`);
          window.setTimeout(() => setNotice(""), 900);
        } catch {
          setNotice("could not add space");
        } finally {
          resolve();
        }
      });
    });
  }

  async function handleRenameSpace(id: string, name: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const updated = await renameRegion(id, name);
          setRegions((current) => current.map((region) => region.id === id ? updated : region));
          setNotice("space renamed");
          window.setTimeout(() => setNotice(""), 900);
        } catch {
          setNotice("could not rename space");
        } finally {
          resolve();
        }
      });
    });
  }

  async function handleDeleteSpace(id: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await removeRegion(id);
          setRegions((current) => current.filter((region) => region.id !== id));
          setTasks((current) => current.map((task) => task.regionId === id ? { ...task, regionId: null } : task));
          setNotice("space removed");
          window.setTimeout(() => setNotice(""), 900);
        } catch {
          setNotice("could not remove space");
        } finally {
          resolve();
        }
      });
    });
  }

  async function handleRestartOnboarding() {
    const data = await restartOnboarding();
    setSpacesOpen(false);
    applyGardenData(data);
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboarding} onDemo={handleDemo} />;
  }

  if (newTaskSeed) {
    return <PlantComposer regions={regions} initialDate={newTaskSeed.date} initialRegionId={newTaskSeed.regionId} onCancel={() => setNewTaskSeed(null)} onPlant={handlePlant} />;
  }

  if (activeTask) {
    return <TaskEditor task={activeTask} regions={regions} onBack={() => setActiveTaskId(null)} onUpdate={handleUpdate} onComplete={handleComplete} />;
  }

  return (
    <div className={styles.appShell} aria-busy={isPending}>
      <GardenHeader view={view} onView={setView} onAdd={() => setNewTaskSeed({})} onRemind={() => setRemindersOpen(true)} />
      {view === "garden" ? <GardenView regions={regions} tasks={tasks} onOpen={setActiveTaskId} onManageSpaces={() => setSpacesOpen(true)} /> : null}
      {view === "distance" ? <DistanceView regions={regions} tasks={tasks} onOpen={setActiveTaskId} /> : null}
      {view === "calendar" ? <CalendarView regions={regions} tasks={tasks} onOpen={setActiveTaskId} onPlant={(date) => setNewTaskSeed({ date })} /> : null}
      {remindersOpen ? <ReminderPanel tasks={tasks} regions={regions} onClose={() => setRemindersOpen(false)} onOpen={(id) => { setRemindersOpen(false); setActiveTaskId(id); }} /> : null}
      {spacesOpen ? <SpacesPanel regions={regions} taskCounts={taskCounts} onClose={() => setSpacesOpen(false)} onCreate={handleCreateSpace} onRename={handleRenameSpace} onDelete={handleDeleteSpace} onReset={handleRestartOnboarding} /> : null}
      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
    </div>
  );
}
