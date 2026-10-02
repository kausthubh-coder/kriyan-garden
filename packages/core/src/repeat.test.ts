import { describe, expect, test } from "bun:test";
import { anchorRepeat, monthDayChoices, nextOccurrence, ordinal, repeatPresets, repeatProblem, repeatRuleText, type RepeatRule } from "./repeat";
import { reminderFires, reminderProblem } from "./reminders";
import { reminderText, repeatText } from "./format";

/** Follow a rule from `date` for `count` steps. */
function series(rule: RepeatRule, date: string, count: number) {
  const dates = [date];
  for (let index = 1; index < count; index++) {
    const next = nextOccurrence(rule, { date: dates[index - 1] ?? date, index });
    if (!next) break;
    dates.push(next);
  }
  return dates;
}

describe("nextOccurrence", () => {
  test("every N days and weeks", () => {
    expect(series({ every: 3, unit: "day" }, "2026-09-29", 3)).toEqual(["2026-09-29", "2026-10-02", "2026-10-05"]);
    expect(series({ every: 2, unit: "week" }, "2026-09-29", 3)).toEqual(["2026-09-29", "2026-10-13", "2026-10-27"]);
  });
  test("weekdays, every week and every other week", () => {
    expect(series({ every: 1, unit: "week", weekdays: [1, 3] }, "2026-09-28", 4)).toEqual(["2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07"]);
    expect(series({ every: 2, unit: "week", weekdays: [1, 3] }, "2026-09-28", 4)).toEqual(["2026-09-28", "2026-09-30", "2026-10-12", "2026-10-14"]);
    // Every weekday: Friday goes to Monday.
    expect(series({ every: 1, unit: "week", weekdays: [1, 2, 3, 4, 5] }, "2026-10-02", 2)).toEqual(["2026-10-02", "2026-10-05"]);
    // Sunday is the last day of a Monday-first week.
    expect(series({ every: 1, unit: "week", weekdays: [0, 6] }, "2026-10-03", 3)).toEqual(["2026-10-03", "2026-10-04", "2026-10-10"]);
  });
  test("the 31st does not drift after a short month", () => {
    const rule = anchorRepeat({ every: 1, unit: "month" }, "2027-01-31");
    expect(series(rule, "2027-01-31", 4)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
    expect(series(anchorRepeat({ every: 1, unit: "month" }, "2028-01-30"), "2028-01-30", 3)).toEqual(["2028-01-30", "2028-02-29", "2028-03-30"]);
  });
  test("nth weekday, last weekday and last day of the month", () => {
    expect(series({ every: 1, unit: "month", monthDay: { kind: "weekday", nth: 2, weekday: 2 } }, "2026-10-13", 3)).toEqual(["2026-10-13", "2026-11-10", "2026-12-08"]);
    expect(series({ every: 1, unit: "month", monthDay: { kind: "weekday", nth: -1, weekday: 5 } }, "2026-10-30", 3)).toEqual(["2026-10-30", "2026-11-27", "2026-12-25"]);
    expect(series({ every: 1, unit: "month", monthDay: { kind: "last_day" } }, "2027-01-31", 3)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(series({ every: 3, unit: "month", monthDay: { kind: "day", day: 15 } }, "2026-10-15", 2)).toEqual(["2026-10-15", "2027-01-15"]);
  });
  test("yearly on 29 February and on the 4th Thursday of November", () => {
    expect(series(anchorRepeat({ every: 1, unit: "year" }, "2028-02-29"), "2028-02-29", 5)).toEqual(["2028-02-29", "2029-02-28", "2030-02-28", "2031-02-28", "2032-02-29"]);
    expect(series({ every: 1, unit: "year", monthDay: { kind: "weekday", nth: 4, weekday: 4 } }, "2026-11-26", 2)).toEqual(["2026-11-26", "2027-11-25"]);
  });
  test("completion basis counts from the day it was done", () => {
    const rule: RepeatRule = { every: 3, unit: "day", basis: "completion" };
    expect(nextOccurrence(rule, { date: "2026-10-01", completedOn: "2026-10-05" })).toBe("2026-10-08");
    expect(nextOccurrence({ every: 3, unit: "day" }, { date: "2026-10-01", completedOn: "2026-10-05" })).toBe("2026-10-04");
  });
  test("a series ends on a date or after a number of times", () => {
    expect(series({ every: 1, unit: "week", ends: { kind: "on", date: "2026-10-13" } }, "2026-09-29", 9)).toEqual(["2026-09-29", "2026-10-06", "2026-10-13"]);
    expect(series({ every: 1, unit: "day", ends: { kind: "after", count: 3 } }, "2026-09-29", 9)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});

describe("repeat words and checks", () => {
  test("repeatText reads naturally", () => {
    expect(repeatText(null)).toBe("Does not repeat");
    expect(repeatText({ every: 1, unit: "week", weekdays: [1, 2, 3, 4, 5] })).toBe("Every weekday");
    expect(repeatText({ every: 2, unit: "week", weekdays: [3, 1] })).toBe("Every 2 weeks on Mon and Wed");
    expect(repeatText({ every: 1, unit: "month", monthDay: { kind: "weekday", nth: -1, weekday: 5 } })).toBe("Every month on the last Fri");
    expect(repeatText({ every: 1, unit: "month", monthDay: { kind: "day", day: 31 } })).toBe("Every month on the 31st");
    expect(repeatText({ every: 1, unit: "month", monthDay: { kind: "weekday", nth: 2, weekday: 2 } })).toBe("Every month on the 2nd Tue");
    expect(repeatText({ every: 3, unit: "day", basis: "completion" })).toBe("Every 3 days after done");
    expect(repeatText({ every: 1, unit: "week", ends: { kind: "on", date: "2026-12-18" } })).toBe("Every week until Fri 18 Dec");
    expect(repeatText({ every: 1, unit: "day", ends: { kind: "after", count: 10 } })).toBe("Every day, 10 times");
    expect(repeatRuleText({ every: 1, unit: "year", monthDay: { kind: "day", day: 29 } }, "2028-02-29")).toBe("Every year on 29 Feb");
    expect(repeatRuleText({ every: 1, unit: "year", monthDay: { kind: "weekday", nth: 4, weekday: 4 } }, "2026-11-26")).toBe("Every year on the 4th Thu of Nov");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"]);
  });
  test("repeatProblem names what to fix", () => {
    expect(repeatProblem({ every: 1, unit: "month", monthDay: { kind: "weekday", nth: 2, weekday: 2 } })).toBeNull();
    expect(repeatProblem({ every: 0, unit: "day" })).toContain("1 to 1000");
    expect(repeatProblem({ every: 1, unit: "day", weekdays: [1] })).toContain("weekly rule");
    expect(repeatProblem({ every: 1, unit: "week", monthDay: { kind: "last_day" } })).toContain("monthly or yearly");
    expect(repeatProblem({ every: 1, unit: "month", monthDay: { kind: "day", day: 32 } })).toContain("1 to 31");
    expect(repeatProblem({ every: 1, unit: "day", ends: { kind: "after", count: 0 } })).toContain("1 to 1000 times");
    expect(repeatProblem({ every: 1, unit: "day", ends: { kind: "on", date: "18 Dec" } })).toContain("YYYY-MM-DD");
  });
  test("presets follow the task's date", () => {
    expect(repeatPresets("2026-10-30").map((preset) => preset.label)).toEqual(["Daily", "Weekdays", "Weekly on Fri", "Monthly on the 30th", "Monthly on the last Fri", "Yearly on 30 Oct"]);
    expect(repeatPresets("2026-10-13").map((preset) => preset.label)).toContain("Monthly on the 2nd Tue");
    expect(monthDayChoices("2026-10-31").map((choice) => choice.label)).toEqual(["On the 31st", "On the last Sat", "On the last day"]);
  });
});

describe("deadline reminders", () => {
  const timezone = "America/New_York";
  test("fire before the deadline even without a planned day", () => {
    const fires = reminderFires({ date: null, time: null, deadline: "2026-10-09", reminders: [{ type: "deadline", daysBefore: 2, time: "18:00" }, { type: "morning_of" }] }, timezone, 0);
    expect(fires).toEqual([{ at: Date.parse("2026-10-07T22:00:00Z"), about: "deadline" }]);
    expect(reminderText({ type: "deadline", daysBefore: 2, time: "18:00" })).toBe("2 days before the deadline at 18:00");
    expect(reminderText({ type: "deadline", daysBefore: 0, time: "09:00" })).toBe("On the deadline at 09:00");
  });
  test("reminderProblem says what each reminder needs", () => {
    expect(reminderProblem({ date: null, time: null, deadline: "2026-10-09", reminders: [{ type: "deadline", daysBefore: 1, time: "18:00" }] })).toBeNull();
    expect(reminderProblem({ date: null, time: null, deadline: null, reminders: [{ type: "deadline", daysBefore: 1, time: "18:00" }] })).toContain("Set a deadline");
    expect(reminderProblem({ date: null, time: null, reminders: [{ type: "morning_of" }] })).toContain("Set a date");
    expect(reminderProblem({ date: "2026-10-09", time: null, reminders: [{ type: "before", minutes: 10 }] })).toContain("Set a time");
  });
});
