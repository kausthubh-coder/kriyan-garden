import { expect, test, spyOn } from "bun:test";
import { createDemoStore } from "./store";
import { id } from "./seed";
import { goal as goalValidator, deletedGoal } from "@kriyan/backend/convex/validators";
import type { Infer } from "convex/values";

test("goal transport saves every panel field and selection matches the get/skip value contract", async () => {
  const demo = createDemoStore("2028-02-28");
  expect(demo.selectedGoal(null)).toBeUndefined();
  expect(demo.selectedGoal("")).toBeUndefined();
  expect(demo.selectedGoal("optimistic-goal")).toBeUndefined();
  expect(demo.selectedGoal("missing")).toBeUndefined();
  const row = await demo.goals.update({ id: id<"goals">("run"), patch: {
    title: "Finish the route", areaId: id<"areas">("school"), startDate: "2028-02-01", targetDate: null,
    metric: { kind: "number", current: 7.25, target: 12, unit: "km" }, status: "archived", note: "Use the river path", sortOrder: 8,
  } });
  expect(demo.selectedGoal(row._id)).toEqual(row);
  expect(Object.keys(row).sort()).toEqual(Object.keys(goalValidator.fields).sort());
  expect(row).toMatchObject({ title: "Finish the route", areaId: "school", startDate: "2028-02-01", targetDate: null, metric: { kind: "number", current: 7.25, target: 12, unit: "km" }, status: "archived", note: "Use the river path", sortOrder: 8 });
  await demo.goals.update({ id: row._id, patch: { metric: { kind: "tasks" }, status: "done" } });
  expect(demo.selectedGoal(row._id)?.metric).toEqual({ kind: "tasks" });
  const created = await demo.goals.create({ title: "Steps", areaId: row.areaId, startDate: "2028-02-28", metric: { kind: "milestones" } });
  expect(created.targetDate).toBeNull();
  expect(created.note).toBe("");
  expect(Object.keys(created).sort()).toEqual(Object.keys(goalValidator.fields).sort());
});

test("milestone transport adds, renames, dates, completes, reopens and removes", async () => {
  const demo = createDemoStore("2028-02-28");
  const created = await demo.goals.createMilestone({ goalId: id<"goals">("run"), title: "First route", sortOrder: 3 });
  expect(created).toMatchObject({ targetDate: null, doneAt: null, sortOrder: 3 });
  const saved = await demo.goals.updateMilestone({ id: created._id, patch: { title: "River route", targetDate: "2028-02-29", doneAt: 42, sortOrder: 1 } });
  expect(saved).toMatchObject({ title: "River route", targetDate: "2028-02-29", doneAt: 42, sortOrder: 1 });
  expect(saved.updatedAt).toBeGreaterThan(created.updatedAt);
  await demo.goals.updateMilestone({ id: created._id, patch: { doneAt: null, targetDate: null } });
  expect(demo.snapshot().goals.find((g) => g._id === "run")?.milestones[0]).toMatchObject({ doneAt: null, targetDate: null });
  await demo.goals.removeMilestone({ id: created._id });
  expect(demo.snapshot().goals.find((g) => g._id === "run")?.milestones).toEqual([]);
  await expect(demo.goals.removeMilestone({ id: created._id })).rejects.toThrow("Milestone was removed");
});

test("delete snapshots raw backend values and notifies only after detaching tasks and deleting milestones", async () => {
  const demo = createDemoStore("2028-02-28");
  const milestone = await demo.goals.createMilestone({ goalId: id<"goals">("run"), title: "Route", targetDate: "2028-03-01", doneAt: 0 });
  const linked = demo.snapshot().tasks.filter((t) => t.goalId === "run");
  let notifications = 0;
  const unsubscribe = demo.subscribe(() => {
    notifications++;
    expect(demo.selectedGoal("run")).toBeUndefined();
    expect(demo.snapshot().goals.flatMap((g) => g.milestones).some((m) => m._id === milestone._id)).toBe(false);
    for (const task of linked) expect(demo.snapshot().tasks.find((t) => t._id === task._id)?.goalId).toBeNull();
  });
  const snapshot: Infer<typeof deletedGoal> = await demo.goals.deleteForUndo({ id: id<"goals">("run") });
  unsubscribe();
  expect(notifications).toBe(1);
  expect(Object.keys(snapshot.goal).sort()).toEqual(Object.keys(goalValidator.fields).sort());
  expect(snapshot.milestones).toEqual([milestone]);
  expect(snapshot.tasks.map((t) => t.id)).toEqual(linked.map((t) => t._id));
  for (const reference of snapshot.tasks) expect(demo.snapshot().tasks.find((t) => t._id === reference.id)?.updatedAt).toBe(reference.updatedAt);
});

test("restore atomically creates fresh goal and milestone IDs and relinks unchanged tasks", async () => {
  const demo = createDemoStore("2028-02-28");
  const original = demo.selectedGoal("run");
  const milestone = await demo.goals.createMilestone({ goalId: id<"goals">("run"), title: "Route", targetDate: "2028-03-01", doneAt: 0, sortOrder: 2 });
  const snapshot = await demo.goals.deleteForUndo({ id: id<"goals">("run") });
  let notifications = 0;
  demo.subscribe(() => {
    notifications++;
    const restored = demo.snapshot().goals.find((g) => g.title === original?.title);
    expect(restored?.milestones).toHaveLength(1);
    for (const reference of snapshot.tasks) expect(demo.snapshot().tasks.find((t) => t._id === reference.id)?.goalId).toBe(restored?._id);
  });
  const restored = await demo.goals.restore({ snapshot });
  expect(notifications).toBe(1);
  expect(restored._id).not.toBe(snapshot.goal._id);
  expect(restored).toMatchObject({ title: original?.title, areaId: original?.areaId, startDate: original?.startDate, targetDate: original?.targetDate, metric: original?.metric, status: original?.status, note: original?.note, sortOrder: original?.sortOrder });
  const restoredMilestone = demo.snapshot().goals.find((g) => g._id === restored._id)?.milestones[0];
  expect(restoredMilestone?._id).not.toBe(milestone._id);
  expect(restoredMilestone).toMatchObject({ goalId: restored._id, title: milestone.title, targetDate: milestone.targetDate, doneAt: 0, sortOrder: 2 });
});

test("restore guards edited, deleted, completed, reopened and relinked tasks even within one millisecond", async () => {
  const clock = spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
  try {
    const demo = createDemoStore("2028-02-28"), goalId = id<"goals">("run");
    const rows = await Promise.all(["unchanged", "edited", "deleted", "completed", "reopened", "relinked", "unlinked again"].map((title) => demo.tasks.create({ title, goalId })));
    const [unchanged, edited, removed, completed, reopened, relinked, unlinked] = rows;
    if (!unchanged || !edited || !removed || !completed || !reopened || !relinked || !unlinked) throw new Error("Fixture missing");
    const snapshot = await demo.goals.deleteForUndo({ id: goalId });
    await demo.tasks.update({ id: edited._id, patch: { title: "Changed" } });
    await demo.tasks.remove({ id: removed._id });
    await demo.tasks.complete({ id: completed._id });
    await demo.tasks.reopen({ id: reopened._id });
    await demo.tasks.update({ id: relinked._id, patch: { goalId: id<"goals">("gpa") } });
    await demo.tasks.update({ id: unlinked._id, patch: { goalId: id<"goals">("gpa") } });
    await demo.tasks.update({ id: unlinked._id, patch: { goalId: null } });
    const restored = await demo.goals.restore({ snapshot });
    const tasks = demo.snapshot().tasks;
    expect(tasks.find((t) => t._id === unchanged._id)?.goalId).toBe(restored._id);
    expect(tasks.some((t) => t._id === removed._id)).toBe(false);
    expect(tasks.find((t) => t._id === relinked._id)?.goalId).toBe(id<"goals">("gpa"));
    for (const row of [edited, completed, reopened, unlinked]) expect(tasks.find((t) => t._id === row._id)?.goalId).toBeNull();
    expect(tasks.find((t) => t._id === edited._id)?.title).toBe("Changed");
  } finally { clock.mockRestore(); }
});

test("restore rejects missing areas and invalid snapshots without writes or notifications", async () => {
  const demo = createDemoStore("2028-02-28");
  const snapshot = await demo.goals.deleteForUndo({ id: id<"goals">("run") });
  const before = structuredClone(demo.snapshot());
  let notifications = 0;
  demo.subscribe(() => notifications++);
  for (const invalid of [
    { ...snapshot, goal: { ...snapshot.goal, ownerId: "another-owner" } },
    { ...snapshot, goal: { ...snapshot.goal, areaId: id<"areas">("removed") } },
    { ...snapshot, goal: { ...snapshot.goal, startDate: "2028-02-30" } },
    { ...snapshot, milestones: [{ ...snapshot.goal, _id: id<"milestones">("bad"), goalId: snapshot.goal._id, title: "", targetDate: null, doneAt: null, sortOrder: 0 }] },
  ]) await expect(demo.goals.restore({ snapshot: invalid })).rejects.toThrow();
  expect(demo.snapshot()).toEqual(before);
  expect(notifications).toBe(0);
  await expect(demo.goals.restore({ snapshot: { ...snapshot, goal: { ...snapshot.goal, _id: id<"goals">("gpa") } } })).rejects.toThrow("Goal already exists");
});

test("delete refuses oversized snapshots without partial changes", async () => {
  const demo = createDemoStore("2028-02-28");
  const goal = demo.snapshot().goals.find((g) => g._id === "run");
  if (!goal) throw new Error("Fixture missing");
  const milestone = await demo.goals.createMilestone({ goalId: goal._id, title: "Route" });
  const current = demo.snapshot().goals.find((g) => g._id === goal._id);
  if (!current) throw new Error("Fixture missing");
  current.milestones = Array.from({ length: 1001 }, () => milestone);
  const before = structuredClone(demo.snapshot());
  let notifications = 0;
  demo.subscribe(() => notifications++);
  await expect(demo.goals.deleteForUndo({ id: goal._id })).rejects.toThrow("too many linked records");
  expect(demo.snapshot()).toEqual(before);
  expect(notifications).toBe(0);
});

test("restore checks the deleted goal's area still exists before notifying or relinking", async () => {
  const demo = createDemoStore("2028-02-28");
  const snapshot = await demo.goals.deleteForUndo({ id: id<"goals">("run") });
  const state = demo.snapshot();
  state.areas = state.areas.filter((area) => area._id !== snapshot.goal.areaId);
  const before = structuredClone(state);
  let notifications = 0;
  demo.subscribe(() => notifications++);
  await expect(demo.goals.restore({ snapshot })).rejects.toThrow("Area was removed");
  expect(demo.snapshot()).toEqual(before);
  expect(notifications).toBe(0);
});

test("restore rejects another owner's task reference and rolls back all rows", async () => {
  const demo = createDemoStore("2028-02-28");
  const snapshot = await demo.goals.deleteForUndo({ id: id<"goals">("run") });
  const foreign = await demo.tasks.create({ title: "Other owner" });
  const row = demo.snapshot().tasks.find((task) => task._id === foreign._id);
  if (!row) throw new Error("Fixture missing");
  row.ownerId = "another-owner";
  const before = structuredClone(demo.snapshot());
  let notifications = 0;
  demo.subscribe(() => notifications++);
  await expect(demo.goals.restore({ snapshot: { ...snapshot, tasks: [...snapshot.tasks, { id: row._id, updatedAt: row.updatedAt }] } })).rejects.toThrow("Linked task not found");
  expect(demo.snapshot()).toEqual(before);
  expect(notifications).toBe(0);
});
test("separate demos keep relative dates and optional lengths without persistence", async () => {
  const first = createDemoStore("2028-02-28"), second = createDemoStore("2028-02-28");
  expect(first.snapshot().tasks.find((t) => t.title === "Calculus problem sheet 5")?.date).toBe("2028-02-29");
  const added = await first.tasks.create({ title: "One task", date: "2028-02-28", time: "10:00" });
  expect(added.durationMinutes).toBeNull();
  expect(first.day("2028-02-28").timed.some((t) => t._id === added._id)).toBe(true);
  expect(second.snapshot().tasks.some((t) => t._id === added._id)).toBe(false);
  await first.tasks.update({ id: added._id, patch: { date: null } });
  expect(first.day("2028-02-28").unscheduled.find((t) => t._id === added._id)?.time).toBeNull();
  await first.tasks.complete({ id: added._id });
  expect(first.day("2028-02-28").unscheduled.some((t) => t._id === added._id)).toBe(false);
});
test("demo repeat uses shared date arithmetic and can undo the new occurrence", async () => {
  const demo = createDemoStore("2028-01-31");
  const task = await demo.tasks.create({ title: "Monthly", date: "2028-01-31", repeat: { every: 1, unit: "month" } });
  await demo.tasks.complete({ id: task._id });
  const next = (await demo.tasks.listActive()).find((t) => t.title === "Monthly");
  expect(next?.date).toBe("2028-02-29");
  if (!next) throw new Error("Repeat occurrence missing");
  await demo.tasks.remove({ id: next._id }); await demo.tasks.reopen({ id: task._id });
  expect(demo.snapshot().tasks.filter((t) => t.title === "Monthly")).toHaveLength(1);
});
