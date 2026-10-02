import { addDays, getWeekday, toIsoDate, weekdayIndex } from "./dates";
import type { Reminder } from "./reminders";
import { lastDayOfMonth, type MonthDay, type RepeatRule, type RepeatUnit } from "./repeat";

/**
 * Repeat, reminder and deadline phrases for quick add. They run before the day,
 * time and length tokens because they contain weekdays, times and numbers.
 */
const DAY = "(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?";
const DAYS = `(?:${DAY})(?:(?:\\s|,\\s?|\\sand\\s)(?:${DAY}))*`;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const ORDINALS: Record<string, 1 | 2 | 3 | 4> = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4 };
const UNITS: Record<string, RepeatUnit> = { day: "day", days: "day", week: "week", weeks: "week", month: "month", months: "month", year: "year", years: "year" };
const clock = (hours: number, minutes: number) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
const weekdaysIn = (text: string) => [...new Set(text.split(/\s|,/).filter((word) => word && word !== "and").map(weekdayIndex))].filter((day) => day >= 0);

/** "6pm", "18:00", "6:30 pm" as HH:MM, or null. */
function timeOf(value: string): string | null {
  const twelve = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm)$/i.exec(value);
  if (twelve) return clock((Number(twelve[1]) % 12) + (/pm/i.test(twelve[3] ?? "") ? 12 : 0), Number(twelve[2] ?? 0));
  const day = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  return day ? clock(Number(day[1]), Number(day[2])) : null;
}
const TIME = "(\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)|(?:[01]?\\d|2[0-3]):[0-5]\\d)";

/** "today", "tomorrow", "fri", "18 dec", "dec 18" as the next such date from `today`. */
function dayOf(value: string, today: string): string | null {
  const word = value.trim().toLowerCase();
  if (word === "today" || word === "tonight") return today;
  if (/^(tomorrow|tmrw?|tom)$/.test(word)) return addDays(today, 1);
  if (new RegExp(`^${DAY}$`).test(word)) return addDays(today, (weekdayIndex(word) - getWeekday(today) + 7) % 7 || 7);
  const dayFirst = /^(\d{1,2})\s+([a-z]+)$/.exec(word), monthFirst = /^([a-z]+)\s+(\d{1,2})$/.exec(word);
  const day = Number(dayFirst ? dayFirst[1] : monthFirst?.[2]);
  const month = MONTHS.indexOf((dayFirst ? dayFirst[2] : monthFirst?.[1] ?? "").slice(0, 3)) + 1;
  if (month < 1 || !Number.isInteger(day)) return null;
  const year = Number(today.slice(0, 4));
  for (const candidate of [year, year + 1]) {
    if (day < 1 || day > lastDayOfMonth(candidate, month)) continue;
    const date = toIsoDate(candidate, month, day);
    if (date >= today) return date;
  }
  return null;
}
const WHEN = `(today|tonight|tomorrow|tmrw?|tom|${DAY}|\\d{1,2}\\s+${MONTH}|${MONTH}\\s+\\d{1,2})`;

export type QuickAddSchedule = { rest: string; repeat: RepeatRule | null; reminders: Reminder[]; deadline: string | null };

export function extractSchedule(text: string, today: string): QuickAddSchedule {
  let rest = ` ${text} `;
  let repeat: RepeatRule | null = null, deadline: string | null = null;
  const reminders: Reminder[] = [];
  // Replace a phrase with a space when `use` accepts its groups; `use` returns false to leave it in the title.
  const take = (pattern: RegExp, use: (...groups: string[]) => boolean | void) => {
    rest = rest.replace(pattern, (match: string, ...args: unknown[]) => (use(...args.slice(0, -2).map((group) => (typeof group === "string" ? group : ""))) === false ? match : " "));
  };
  const amend = (patch: Partial<RepeatRule>) => { if (repeat) repeat = { ...repeat, ...patch }; };

  take(new RegExp(`\\sdue\\s(?:on\\s|by\\s)?${WHEN}(?=\\s)`, "i"), (when) => {
    const date = dayOf(when, today);
    if (!date) return false;
    deadline = date;
  });

  take(new RegExp(`\\sremind(?:\\sme)?\\s(\\d+)\\s?(?:d|days?)\\sbefore\\s(?:the\\s)?(?:due|deadline)(?:\\sat\\s${TIME})?(?=\\s)`, "gi"), (days, at) => {
    reminders.push({ type: "deadline", daysBefore: Math.min(30, Number(days)), time: (at && timeOf(at)) || "18:00" });
  });
  take(new RegExp(`\\sremind(?:\\sme)?\\son\\s(?:the\\s)?(?:due\\sdate|deadline)(?:\\sat\\s${TIME})?(?=\\s)`, "gi"), (at) => {
    reminders.push({ type: "deadline", daysBefore: 0, time: (at && timeOf(at)) || "09:00" });
  });
  take(/\sremind(?:\sme)?\s(\d+)\s?(m|mins?|minutes?|h|hrs?|hours?|d|days?)\sbefore(?=\s)/gi, (amount, unit) => {
    const factor = /^m/i.test(unit) ? 1 : /^h/i.test(unit) ? 60 : 1440;
    reminders.push({ type: "before", minutes: Math.min(10080, Number(amount) * factor) });
  });
  take(/\sremind(?:\sme)?\s(?:the\s)?day\sbefore(?=\s)/gi, () => { reminders.push({ type: "day_before" }); });
  take(/\sremind(?:\sme)?\s(?:in\s)?(?:the\s)?morning(?:\sof)?(?=\s)/gi, () => { reminders.push({ type: "morning_of" }); });
  take(/\sremind(?:\sme)?\sat\sstart(?=\s)/gi, () => { reminders.push({ type: "at_start" }); });
  take(new RegExp(`\\sremind(?:\\sme)?\\sat\\s${TIME}(?=\\s)`, "gi"), (at) => {
    const time = timeOf(at);
    if (!time) return false;
    reminders.push({ type: "at_time", time });
  });

  take(/\s(daily|weekly|monthly|yearly|annually)(?=\s)/i, (word) => {
    const unit = ({ daily: "day", weekly: "week", monthly: "month", yearly: "year", annually: "year" } as const)[word.toLowerCase() as "daily"];
    repeat = { every: 1, unit };
  });
  take(/\severy\sweekday(?=\s)|\sweekdays(?=\s)/i, () => { repeat = { every: 1, unit: "week", weekdays: [1, 2, 3, 4, 5] }; });
  take(new RegExp(`\\severy\\s(?:(other)\\s)?(${DAYS})(?=\\s)`, "i"), (other, days) => {
    repeat = { every: other ? 2 : 1, unit: "week", weekdays: weekdaysIn(days.toLowerCase()) };
  });
  take(/\severy\s(?:(\d+|other)\s)?(days?|weeks?|months?|years?)(?=\s)/i, (count, unit) => {
    repeat = { every: count.toLowerCase() === "other" ? 2 : Math.min(1000, Number(count || 1)), unit: UNITS[unit.toLowerCase()] ?? "day" };
  });
  if (!repeat) return { rest, repeat, reminders, deadline };

  const unit = (repeat as RepeatRule).unit;
  take(new RegExp(`\\son\\s(${DAYS})(?=\\s)`, "i"), (days) => {
    if (unit !== "week") return false;
    amend({ weekdays: weekdaysIn(days.toLowerCase()) });
  });
  take(new RegExp(`\\son\\sthe\\s(first|1st|second|2nd|third|3rd|fourth|4th|last)\\s(${DAY})(?=\\s)`, "i"), (nth, day) => {
    if (unit !== "month" && unit !== "year") return false;
    const monthDay: MonthDay = { kind: "weekday", nth: nth.toLowerCase() === "last" ? -1 : ORDINALS[nth.toLowerCase()] ?? 1, weekday: weekdayIndex(day) };
    amend({ monthDay });
  });
  take(/\son\sthe\slast\sday(?=\s)/i, () => {
    if (unit !== "month") return false;
    amend({ monthDay: { kind: "last_day" } });
  });
  take(/\son\sthe\s(\d{1,2})(?:st|nd|rd|th)?(?=\s)/i, (day) => {
    if (unit !== "month" || Number(day) < 1 || Number(day) > 31) return false;
    amend({ monthDay: { kind: "day", day: Number(day) } });
  });
  take(/\safter\s(?:it(?:'s|\sis)\s)?(?:done|completion|completed)(?=\s)/i, () => { amend({ basis: "completion" }); });
  take(new RegExp(`\\suntil\\s${WHEN}(?=\\s)`, "i"), (when) => {
    const date = dayOf(when, today);
    if (!date) return false;
    amend({ ends: { kind: "on", date } });
  });
  take(/\s(\d{1,4})\stimes(?=\s)/i, (count) => {
    if (Number(count) < 1) return false;
    amend({ ends: { kind: "after", count: Math.min(1000, Number(count)) } });
  });
  return { rest, repeat, reminders, deadline };
}
