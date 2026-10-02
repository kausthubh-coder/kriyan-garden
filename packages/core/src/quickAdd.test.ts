import { quickAddCases } from "./quickAddCases";
import { quickAddGrammar } from "./quickAddGrammar";
import { describe, expect, test } from "bun:test";
import { addDays, getWeekday, parse, toIsoDate, weekdayIndex } from "./index";
import type { QuickAddContext, QuickAddResult } from "./index";

const context: QuickAddContext = {
  today: "2026-09-29",
  defaultDate: "2026-10-01",
  defaultAreaId: "life",
  areas: [
    { id: "school", name: "School" },
    { id: "biz", name: "Business" },
    { id: "life", name: "Life" },
    { id: "music", name: "Music" },
  ],
  projects: [{ id: "econ", name: "Econ 101", areaId: "school" }],
};

const defaults: QuickAddResult = {
  title: "",
  areaId: "life",
  projectId: null,
  date: context.defaultDate,
  time: null,
  durationMinutes: null,
  deadline: null,
  repeat: null,
  reminders: [],
};

describe("prototype quick add grammar", () => {
  for (const row of quickAddGrammar) for (const token of row.tokens) {
    test(`documented token ${token}`, () => {
      expect(parse(`task ${token}${row.suffix}`, context)).toEqual({ ...defaults, title: "Task", ...row.expected });
    });
  }
  const cases = quickAddCases;

  for (const { text, expected } of cases) {
    test(JSON.stringify(text), () => {
      expect(parse(text, context)).toEqual({ ...defaults, ...expected });
    });
  }

  test("preserves a null default date and the selected area, even with a time", () => {
    expect(parse("call at 9", { ...context, defaultDate: null, defaultAreaId: "biz" })).toEqual({
      ...defaults, title: "Call", date: null, areaId: "biz", time: "09:00",
    });
  });

  test("takes today exclusively from context and does not mutate its input", () => {
    const fixed = Object.freeze({
      ...context,
      today: "2027-12-31",
      areas: Object.freeze(context.areas.map((area) => Object.freeze({ ...area }))),
      projects: Object.freeze(context.projects.map((project) => Object.freeze({ ...project }))),
    });
    const snapshot = JSON.stringify(fixed);
    const expected = { ...defaults, title: "Essay", date: "2028-01-01", projectId: "econ", areaId: "school" };
    expect(parse("essay tomorrow #econ", fixed)).toEqual(expected);
    expect(parse("essay tomorrow #econ", fixed)).toEqual(expected);
    expect(JSON.stringify(fixed)).toBe(snapshot);
  });
});

describe("calendar dates", () => {
  test("formats calendar components and looks up weekdays", () => {
    expect(toIsoDate(2026, 9, 3)).toBe("2026-09-03");
    expect(getWeekday(context.today)).toBe(2);
    expect(weekdayIndex("Tuesday")).toBe(2);
    expect(weekdayIndex("FRI")).toBe(5);
    expect(weekdayIndex("unknown")).toBe(-1);
  });

  test("crosses month, year, leap-day and DST boundaries as calendar days", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});
