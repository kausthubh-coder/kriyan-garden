import { expect, test } from "bun:test";
import { goalTargetDates } from "./goals";
test("goal targets use local calendar dates and clamp the three-month day", () => {
  expect(goalTargetDates("2026-09-30")).toEqual(["2026-09-30", "2026-12-30", "2026-12-31"]);
  expect(goalTargetDates("2026-11-30")).toEqual(["2026-11-30", "2027-02-28", "2026-12-31"]);
  expect(goalTargetDates("2027-11-30")).toEqual(["2027-11-30", "2028-02-29", "2027-12-31"]);
});
