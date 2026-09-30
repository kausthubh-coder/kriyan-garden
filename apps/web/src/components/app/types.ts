import type { FunctionReturnType } from "convex/server";
import type { CSSProperties } from "react";
import { addDays } from "@kriyan/core";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import { api } from "@kriyan/backend/convex/_generated/api";

export type Task = Doc<"tasks">;
export type Area = Doc<"areas">;
export type Project = Doc<"projects">;
export type Profile = Doc<"profiles">;
export type Goal = FunctionReturnType<typeof api.goals.list>[number];
export type Day = FunctionReturnType<typeof api.day.get>;
export type Week = FunctionReturnType<typeof api.week.get>;
export type View =
  "day" | "list" | "week" | "goals" | "onboarding" | "settings";
export type Variables = CSSProperties & {
  "--c"?: string;
  "--bc"?: string;
  "--need"?: number;
};
export type PanelSection = "time" | "length" | undefined;
export function areaColor(area?: Area) {
  return area?.color === "blue"
    ? "var(--school)"
    : area?.color === "orange"
      ? "var(--biz)"
      : area?.color === "green"
        ? "var(--life)"
        : "var(--ink-2)";
}
export const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const dateObject = (date: string) => new Date(`${date}T12:00:00`);
export const dayName = (date: string) =>
  dateObject(date).toLocaleDateString("en", { weekday: "long" });
export const longDate = (date: string) =>
  dateObject(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
export const shortDate = (date: string) =>
  dateObject(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
export const relativeDate = (date: string, today: string) =>
  date === today
    ? "Today"
    : date === addDays(today, 1)
      ? "Tomorrow"
      : date === addDays(today, -1)
        ? "Yesterday"
        : shortDate(date);
export const projectName = (task: Task, projects: Project[], areas: Area[]) =>
  projects.find((project) => project._id === task.projectId)?.name ??
  areas.find((area) => area._id === task.areaId)?.name ??
  "Task";
