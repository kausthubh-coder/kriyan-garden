import { expect, test } from "bun:test";
import { deadlineCapacity, layoutIntervals, weekStart } from "./planning";
test("deadline capacity counts active lengths across every area and caps overfull days at zero", () => {
  expect(
    deadlineCapacity("2026-09-29", "2026-10-01", 360, [
      { date: "2026-09-29", status: "active", durationMinutes: 400 },
      { date: "2026-09-30", status: "active", durationMinutes: 60 },
      { date: "2026-09-30", status: "active", durationMinutes: null },
      { date: "2026-10-01", status: "completed", durationMinutes: 360 },
    ]),
  ).toBe(660);
  expect(weekStart("2026-10-04")).toBe("2026-09-28");
});
test("overlap groups keep columns stable including zero-length markers and chained overlaps", () => {
  const blocks = layoutIntervals([
    { start: 600, end: 660 },
    { start: 615, end: 615 },
    { start: 645, end: 700 },
    { start: 710, end: 750 },
  ]);
  expect(blocks.map(({ column, columns }) => [column, columns])).toEqual([
    [0, 3],
    [1, 3],
    [2, 3],
    [0, 1],
  ]);
});
