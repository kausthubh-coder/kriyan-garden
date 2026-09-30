import type { FunctionReturnType } from "convex/server";
import type { CSSProperties } from "react";
import { namedAreaColors } from "@kriyan/core";
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
  return namedAreaColors[area?.color ?? "grey"];
}
export const projectName = (task: Task, projects: Project[], areas: Area[]) =>
  projects.find((project) => project._id === task.projectId)?.name ??
  areas.find((area) => area._id === task.areaId)?.name ??
  "Task";
