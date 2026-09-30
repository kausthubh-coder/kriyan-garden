import { expect, test } from "bun:test";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@kriyan/backend/convex/_generated/api";
import { goal as validator } from "@kriyan/backend/convex/validators";
import { seed } from "../demo/seed";
import { selectGoal } from "./goalSelection";

test("list-based goal selection handles loading, skipped, missing and deleted URL IDs", () => {
  const goals: FunctionReturnType<typeof api.goals.list> = seed("2028-02-28").goals;
  expect(selectGoal("run", undefined)).toBeUndefined();
  expect(selectGoal(null, goals)).toBeUndefined();
  expect(selectGoal("", goals)).toBeUndefined();
  expect(selectGoal("optimistic-goal", goals)).toBeUndefined();
  expect(selectGoal("malformed", goals)).toBeUndefined();
  const selected = selectGoal("run", goals);
  expect(selected?.title).toBe("Run a 10k");
  expect(Object.keys(selected ?? {}).sort()).toEqual(Object.keys(validator.fields).sort());
  expect(selectGoal("run", goals.filter((goal) => goal._id !== "run"))).toBeUndefined();
  expect(selectGoal("gpa", goals)?.title).toBe("3.8 GPA this semester");
});
