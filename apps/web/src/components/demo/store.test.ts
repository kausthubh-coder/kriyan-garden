import { expect, test } from "bun:test";
import { createDemoStore } from "./store";
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
