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
};

describe("prototype quick add grammar", () => {
  const cases: { text: string; expected: Partial<QuickAddResult> }[] = [
    { text: "gym tomorrow 7am", expected: { title: "Gym", date: "2026-09-30", time: "07:00" } },
    { text: "call amma", expected: { title: "Call amma" } },
    { text: "essay fri #econ 2h", expected: { title: "Essay", areaId: "school", projectId: "econ", date: "2026-10-02", durationMinutes: 120 } },
    { text: "read for 20 minutes at 9", expected: { title: "Read for 20 minutes", time: "09:00" } },
    { text: "standup 9:30 15m #biz", expected: { title: "Standup", areaId: "biz", time: "09:30", durationMinutes: 15 } },
    { text: "revise 1h30m tonight", expected: { title: "Revise", date: "2026-09-29", durationMinutes: 90 } },
    { text: "buy milk later", expected: { title: "Buy milk", date: null } },
    { text: "lunch at 1", expected: { title: "Lunch", time: "13:00" } },
    { text: "report tue", expected: { title: "Report", date: "2026-10-06" } },
    { text: "", expected: { title: "" } },
    { text: " \t\n ", expected: { title: "" } },
    { text: "study on Wednesday 1.5hrs", expected: { title: "Study", date: "2026-09-30", durationMinutes: 90 } },
    { text: "call at 12am", expected: { title: "Call", time: "00:00" } },
    { text: "lunch 12pm", expected: { title: "Lunch", time: "12:00" } },
    { text: "read #unknown", expected: { title: "Read #unknown" } },
    { text: "essay #ECON101", expected: { title: "Essay", projectId: "econ", areaId: "school" } },
    { text: "standup #business", expected: { title: "Standup", areaId: "biz" } },
    { text: "call today fri", expected: { title: "Call fri", date: "2026-09-29" } },
  ];

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
