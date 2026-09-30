import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { api } from "@kriyan/backend/convex/_generated/api";
import { theme } from "./theme";
export type Task = Doc<"tasks">;
export type Area = Doc<"areas">;
export type Project = Doc<"projects">;
export type Profile = Doc<"profiles">;
export type Event = Doc<"events">;
export type Goal = FunctionReturnType<typeof api.goals.list>[number];
export type Day = FunctionReturnType<typeof api.day.get>;
export const areaColor = (area?: Pick<Area, "color">) =>
  area?.color === "blue"
    ? theme.colors.school
    : area?.color === "orange"
      ? theme.colors.biz
      : area?.color === "green"
        ? theme.colors.life
        : area?.color === "red"
          ? theme.colors["area-red"]
          : area?.color === "yellow"
            ? theme.colors["area-yellow"]
            : area?.color === "purple"
              ? theme.colors["area-purple"]
              : area?.color === "teal"
                ? theme.colors["area-teal"]
                : theme.colors["ink-2"];
