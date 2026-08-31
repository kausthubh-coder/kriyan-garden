"use server";

import { revalidatePath } from "next/cache";
import { completeOnboardingRecord, createRegionRecord, createTaskRecord, deleteRegionRecord, loadDemoWorkspaceRecord, restartOnboardingRecord, setTaskCompletion, updateRegionRecord, updateTaskRecord } from "@/lib/db";
import type { GardenData, Horizon, Region, Task, TaskDraft, TaskPatch } from "@/lib/types";

const horizons = new Set<Horizon>(["now", "season", "someday"]);

function cleanText(value: unknown, maximum = 180) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function nullableText(value: unknown, maximum = 180) {
  const clean = cleanText(value, maximum);
  return clean.length > 0 ? clean : null;
}

function cleanDraft(input: TaskDraft): TaskDraft {
  const title = cleanText(input.title);
  if (!title) throw new Error("A task needs a title.");
  return {
    title,
    regionId: nullableText(input.regionId, 80),
    horizon: horizons.has(input.horizon) ? input.horizon : "now",
    dueDate: nullableText(input.dueDate, 10),
    time: nullableText(input.time, 40),
    durationMinutes: typeof input.durationMinutes === "number" && input.durationMinutes > 0 ? Math.min(input.durationMinutes, 1440) : null,
    repeatRule: nullableText(input.repeatRule, 100),
    reminders: Array.isArray(input.reminders) ? input.reminders.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8) : [],
    content: typeof input.content === "string" ? input.content.slice(0, 100_000) : "",
  };
}

export async function createTask(input: TaskDraft): Promise<Task> {
  const task = createTaskRecord(cleanDraft(input));
  revalidatePath("/garden");
  return task;
}

export async function updateTask(id: string, input: TaskPatch): Promise<Task> {
  const cleanId = cleanText(id, 80);
  if (!cleanId) throw new Error("Task not found.");
  const patch: TaskPatch = {};
  if ("title" in input) {
    const title = cleanText(input.title);
    if (!title) throw new Error("A task needs a title.");
    patch.title = title;
  }
  if ("regionId" in input) patch.regionId = nullableText(input.regionId, 80);
  if ("horizon" in input && input.horizon && horizons.has(input.horizon)) patch.horizon = input.horizon;
  if ("dueDate" in input) patch.dueDate = nullableText(input.dueDate, 10);
  if ("time" in input) patch.time = nullableText(input.time, 40);
  if ("durationMinutes" in input) patch.durationMinutes = typeof input.durationMinutes === "number" && input.durationMinutes > 0 ? Math.min(input.durationMinutes, 1440) : null;
  if ("repeatRule" in input) patch.repeatRule = nullableText(input.repeatRule, 100);
  if ("reminders" in input) patch.reminders = Array.isArray(input.reminders) ? input.reminders.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8) : [];
  if ("content" in input) patch.content = typeof input.content === "string" ? input.content.slice(0, 100_000) : "";
  const task = updateTaskRecord(cleanId, patch);
  revalidatePath("/garden");
  return task;
}

export async function completeTask(id: string, completed: boolean): Promise<Task> {
  const cleanId = cleanText(id, 80);
  if (!cleanId) throw new Error("Task not found.");
  const task = setTaskCompletion(cleanId, Boolean(completed));
  revalidatePath("/garden");
  return task;
}

export async function completeOnboarding(input: string[]): Promise<GardenData> {
  const names = Array.from(new Set(input.map((name) => cleanText(name, 48)).filter(Boolean))).slice(0, 8);
  if (names.length === 0) throw new Error("Name at least one space.");
  const data = completeOnboardingRecord(names);
  revalidatePath("/garden");
  return data;
}

export async function exploreDemoWorkspace(): Promise<GardenData> {
  const data = loadDemoWorkspaceRecord();
  revalidatePath("/garden");
  return data;
}

export async function restartOnboarding(): Promise<GardenData> {
  const data = restartOnboardingRecord();
  revalidatePath("/garden");
  return data;
}

export async function createRegion(name: string): Promise<Region> {
  const cleanName = cleanText(name, 48);
  if (!cleanName) throw new Error("A space needs a name.");
  const region = createRegionRecord(cleanName);
  revalidatePath("/garden");
  return region;
}

export async function renameRegion(id: string, name: string): Promise<Region> {
  const cleanId = cleanText(id, 80);
  const cleanName = cleanText(name, 48);
  if (!cleanId || !cleanName) throw new Error("A space needs a name.");
  const region = updateRegionRecord(cleanId, cleanName);
  revalidatePath("/garden");
  return region;
}

export async function removeRegion(id: string): Promise<void> {
  const cleanId = cleanText(id, 80);
  if (!cleanId) throw new Error("Space not found.");
  deleteRegionRecord(cleanId);
  revalidatePath("/garden");
}
