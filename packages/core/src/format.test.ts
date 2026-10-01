import { describe, expect, test } from "bun:test";
import {
  countText,
  dayValue,
  daySummary,
  daysBetween,
  deadlineValue,
  lengthValue,
  longDate,
  relativeDay,
  reminderText,
  remindersValue,
  repeatText,
  shortDate,
  timeValue,
  weekdayName,
} from "./format";

const today = "2026-09-30"; // a Wednesday

describe("dates", () => {
  test("names and short forms never use locale APIs", () => {
    expect(weekdayName(today)).toBe("Wednesday");
    expect(longDate(today)).toBe("30 September");
    expect(shortDate(today)).toBe("Wed 30 Sep");
    expect(shortDate("2026-10-01")).toBe("Thu 1 Oct");
    expect(shortDate("2027-01-03")).toBe("Sun 3 Jan");
  });

  test("relative days", () => {
    expect(relativeDay(today, today)).toBe("Today");
    expect(relativeDay("2026-10-01", today)).toBe("Tomorrow");
    expect(relativeDay("2026-09-29", today)).toBe("Yesterday");
    expect(relativeDay("2026-10-02", today)).toBe("Fri 2 Oct");
  });

  test("day row value", () => {
    expect(dayValue(null, today)).toBe("No date yet");
    expect(dayValue(today, today)).toBe("Today, Wed 30 Sep");
    expect(dayValue("2026-10-01", today)).toBe("Tomorrow, Thu 1 Oct");
    expect(dayValue("2026-10-05", today)).toBe("Mon 5 Oct");
  });

  test("days between crosses months and years", () => {
    expect(daysBetween(today, "2026-10-03")).toBe(3);
    expect(daysBetween(today, "2026-09-28")).toBe(-2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("time and length", () => {
  test("time row value", () => {
    expect(timeValue(null, null)).toBe("Any time");
    expect(timeValue(null, 30)).toBe("Any time");
    expect(timeValue("14:30", null)).toBe("14:30");
    expect(timeValue("14:30", 60)).toBe("14:30 to 15:30");
    expect(timeValue("09:05", 20)).toBe("09:05 to 09:25");
  });

  test("length is optional", () => {
    expect(lengthValue(null)).toBe("None");
    expect(lengthValue(45)).toBe("45m");
    expect(lengthValue(90)).toBe("1h 30m");
  });
});

describe("deadline", () => {
  test("words and urgency", () => {
    expect(deadlineValue(null, today)).toEqual({ text: "None", urgent: false });
    expect(deadlineValue(today, today)).toEqual({ text: "Wed 30 Sep, today", urgent: true });
    expect(deadlineValue("2026-10-01", today)).toEqual({ text: "Thu 1 Oct, tomorrow", urgent: true });
    expect(deadlineValue("2026-10-03", today)).toEqual({ text: "Sat 3 Oct, in 3 days", urgent: true });
    expect(deadlineValue("2026-10-07", today)).toEqual({ text: "Wed 7 Oct, in 7 days", urgent: true });
    expect(deadlineValue("2026-10-08", today)).toEqual({ text: "Thu 8 Oct, in 8 days", urgent: false });
    expect(deadlineValue("2026-09-28", today)).toEqual({ text: "Mon 28 Sep, 2 days ago", urgent: true });
  });
});

describe("repeat", () => {
  test("in words", () => {
    expect(repeatText(null)).toBe("Does not repeat");
    expect(repeatText({ every: 1, unit: "day" })).toBe("Every day");
    expect(repeatText({ every: 3, unit: "day" })).toBe("Every 3 days");
    expect(repeatText({ every: 1, unit: "week" })).toBe("Every week");
    expect(repeatText({ every: 1, unit: "week", weekdays: [4, 1] })).toBe("Every week on Mon and Thu");
    expect(repeatText({ every: 2, unit: "week", weekdays: [0, 1, 3] })).toBe("Every 2 weeks on Mon, Wed and Sun");
    expect(repeatText({ every: 1, unit: "month" })).toBe("Every month");
    expect(repeatText({ every: 1, unit: "year" })).toBe("Every year");
  });
});

describe("reminders", () => {
  test("each kind in words", () => {
    expect(reminderText({ type: "at_start" })).toBe("At start");
    expect(reminderText({ type: "before", minutes: 10 })).toBe("10 min before");
    expect(reminderText({ type: "before", minutes: 60 })).toBe("1 hour before");
    expect(reminderText({ type: "before", minutes: 120 })).toBe("2 hours before");
    expect(reminderText({ type: "before", minutes: 1440 })).toBe("1 day before");
    expect(reminderText({ type: "morning_of" })).toBe("Morning of");
    expect(reminderText({ type: "day_before" })).toBe("Day before");
    expect(reminderText({ type: "at_time", time: "08:00" })).toBe("At 08:00");
  });

  test("row value", () => {
    expect(remindersValue([])).toBe("None");
    expect(remindersValue([{ type: "before", minutes: 10 }, { type: "at_start" }])).toBe("10 min before, at start");
  });
});

describe("counts and summary", () => {
  test("plurals", () => {
    expect(countText(1, "task")).toBe("1 task");
    expect(countText(0, "task")).toBe("0 tasks");
    expect(countText(2, "class", "classes")).toBe("2 classes");
  });

  test("day summary", () => {
    expect(daySummary({ left: 0, total: 0, plannedMinutes: 0, withoutLength: 0 })).toBe("Nothing planned.");
    expect(daySummary({ left: 0, total: 2, plannedMinutes: 0, withoutLength: 0, hideEmptyCount: true })).toBe("All tasks done.");
    expect(daySummary({ left: 0, total: 2, plannedMinutes: 30, withoutLength: 0, hideEmptyCount: true })).toBe("30m planned.");
    expect(daySummary({ left: 1, total: 3, plannedMinutes: 30, withoutLength: 0 })).toBe("1 task left, 30m planned.");
    expect(daySummary({ left: 7, total: 9, plannedMinutes: 245, withoutLength: 2 })).toBe("7 tasks left, 4h 5m planned, 2 with no length.");
    expect(daySummary({ left: 2, total: 2, plannedMinutes: 0, withoutLength: 2 })).toBe("2 tasks left, 2 with no length.");
  });
});
