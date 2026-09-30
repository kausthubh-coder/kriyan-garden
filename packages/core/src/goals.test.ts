import { expect, test } from "bun:test";
import { goalProgress } from "./goals";
import { localClock } from "./dates";
test("local date and time follow the user's timezone across midnight and DST", () => {
  const now = new Date("2026-09-30T02:00:00Z");
  expect(localClock(now, "America/New_York")).toEqual({
    today: "2026-09-29",
    minutes: 1320,
  });
  expect(localClock(now, "Asia/Kolkata")).toEqual({
    today: "2026-09-30",
    minutes: 450,
  });
  expect(
    localClock(new Date("2026-03-08T07:00:00Z"), "America/New_York"),
  ).toEqual({ today: "2026-03-08", minutes: 180 });
});
const base = {
  startDate: "2026-09-01",
  targetDate: "2026-09-11",
  linkedTasks: { done: 1, total: 4 },
  milestones: [{ doneAt: 0 }, { doneAt: null }],
};
test("goal progress uses the selected metric and linear calendar pace", () => {
  expect(
    goalProgress({ ...base, metric: { kind: "tasks" } }, "2026-09-06"),
  ).toMatchObject({ progress: 0.25, expected: 0.5, status: "Behind pace" });
  expect(
    goalProgress({ ...base, metric: { kind: "milestones" } }, "2026-09-06"),
  ).toMatchObject({ progress: 0.5, status: "On pace" });
  expect(
    goalProgress(
      {
        ...base,
        metric: { kind: "number", current: 6.5, target: 10, unit: "km" },
      },
      "2026-09-06",
    ),
  ).toMatchObject({ progress: 0.65, status: "Ahead" });
});
test("pace handles empty totals, dates outside the range, missing and same-day targets", () => {
  const goal = {
    ...base,
    metric: { kind: "tasks" } as const,
    linkedTasks: { done: 0, total: 0 },
  };
  expect(goalProgress(goal, "2026-08-31")).toMatchObject({
    progress: 0,
    expected: 0,
  });
  expect(goalProgress(goal, "2026-09-12")).toMatchObject({
    expected: 1,
    status: "Late",
  });
  expect(
    goalProgress({ ...goal, targetDate: null }, "2026-09-06"),
  ).toMatchObject({ expected: null, status: "No target date" });
  expect(
    goalProgress({ ...goal, targetDate: goal.startDate }, "2026-09-01")
      .expected,
  ).toBe(1);
  expect(
    goalProgress(
      {
        ...goal,
        metric: { kind: "number", current: 12, target: 10, unit: "km" },
      },
      "2026-09-06",
    ),
  ).toMatchObject({ progress: 1, status: "Complete" });
});
