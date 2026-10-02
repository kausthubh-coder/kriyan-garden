import { addDays, getWeekday, toIsoDate } from "./dates";

/**
 * Repeat rules, the same everywhere: backend, web, Android, quick add and MCP.
 * Weekdays run Sunday 0 to Saturday 6. Weeks for `every` count from Monday.
 */
export type RepeatUnit = "day" | "week" | "month" | "year";
export type MonthDay =
  | { kind: "day"; day: number }
  | { kind: "weekday"; nth: 1 | 2 | 3 | 4 | -1; weekday: number }
  | { kind: "last_day" };
export type RepeatEnd = { kind: "on"; date: string } | { kind: "after"; count: number };
export type RepeatRule = {
  every: number;
  unit: RepeatUnit;
  weekdays?: readonly number[];
  /** Which day of the month a monthly or yearly rule lands on. */
  monthDay?: MonthDay;
  /** "completion" counts the next date from the day the task was done. */
  basis?: "schedule" | "completion";
  ends?: RepeatEnd;
};

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
const split = (date: string) => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) });

/** 28 to 31. `month` is one-based. */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Which weekday of its month a date is: the 2nd Tuesday, and whether it is also the last one. */
export function weekdayOfMonth(date: string): { nth: number; weekday: number; isLast: boolean } {
  const { year, month, day } = split(date);
  return { nth: Math.ceil(day / 7), weekday: getWeekday(date), isLast: day + 7 > lastDayOfMonth(year, month) };
}

/** The day of the month a rule lands on in that month. */
export function dayInMonth(year: number, month: number, monthDay: MonthDay): number {
  const last = lastDayOfMonth(year, month);
  if (monthDay.kind === "last_day") return last;
  if (monthDay.kind === "day") return Math.min(monthDay.day, last);
  if (monthDay.nth === -1) return last - ((getWeekday(toIsoDate(year, month, last)) - monthDay.weekday + 7) % 7);
  const first = getWeekday(toIsoDate(year, month, 1));
  return 1 + ((monthDay.weekday - first + 7) % 7) + (monthDay.nth - 1) * 7;
}

/** Monthly and yearly rules remember the day they started on, so the 31st never drifts to the 28th. */
export function anchorRepeat<T extends RepeatRule>(rule: T, date: string): T {
  if ((rule.unit !== "month" && rule.unit !== "year") || rule.monthDay) return rule;
  return { ...rule, monthDay: { kind: "day", day: split(date).day } };
}

/**
 * The date after `date`, or null once the series has ended.
 * `index` is the occurrence number of `date`, starting at 1.
 * `completedOn` is the person's local day the task was done; it only matters for `basis: "completion"`.
 */
export function nextOccurrence(rule: RepeatRule, current: { date: string; completedOn?: string | null; index?: number | null }): string | null {
  if (rule.ends?.kind === "after" && (current.index ?? 1) >= rule.ends.count) return null;
  const from = rule.basis === "completion" && current.completedOn ? current.completedOn : current.date;
  let next: string;
  if (rule.unit === "day") next = addDays(from, rule.every);
  else if (rule.unit === "week") {
    if (!rule.weekdays?.length) next = addDays(from, rule.every * 7);
    else {
      const mondayFirst = (day: number) => (day + 6) % 7;
      const today = mondayFirst(getWeekday(from));
      const days = [...new Set(rule.weekdays.map(mondayFirst))].sort((a, b) => a - b);
      const later = days.find((day) => day > today);
      next = later !== undefined ? addDays(from, later - today) : addDays(from, rule.every * 7 - today + (days[0] ?? 0));
    }
  } else {
    const { year, month, day } = split(from);
    const target = rule.unit === "month" ? year * 12 + (month - 1) + rule.every : (year + rule.every) * 12 + (month - 1);
    const targetYear = Math.floor(target / 12), targetMonth = (target % 12) + 1;
    next = toIsoDate(targetYear, targetMonth, dayInMonth(targetYear, targetMonth, rule.monthDay ?? { kind: "day", day }));
  }
  if (rule.ends?.kind === "on" && next > rule.ends.date) return null;
  return next;
}

/** The first date on or after `from` that a rule lands on, so "every friday" starts on a Friday. */
export function firstOccurrence(rule: RepeatRule, from: string): string {
  for (let offset = 0; offset < 400; offset++) {
    const date = addDays(from, offset);
    if (rule.unit === "week" && rule.weekdays?.length) {
      if (rule.weekdays.includes(getWeekday(date))) return date;
    } else if ((rule.unit === "month" || rule.unit === "year") && rule.monthDay) {
      const { year, month, day } = split(date);
      if (day === dayInMonth(year, month, rule.monthDay)) return date;
    } else return date;
  }
  return from;
}

/** A sentence saying what to fix, or null when the rule is valid. */
export function repeatProblem(rule: RepeatRule): string | null {
  if (!Number.isInteger(rule.every) || rule.every < 1 || rule.every > 1000) return "Invalid repeat interval. Use a whole number from 1 to 1000.";
  if (rule.weekdays !== undefined) {
    if (rule.unit !== "week" || rule.weekdays.length === 0) return "Repeat weekdays need a weekly rule and at least one day.";
    if (rule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return "Invalid weekday. Use numbers from 0 to 6.";
  }
  if (rule.monthDay !== undefined) {
    if (rule.unit !== "month" && rule.unit !== "year") return "Invalid repeat. A day of the month needs a monthly or yearly rule.";
    const monthDay = rule.monthDay;
    if (monthDay.kind === "day" && (!Number.isInteger(monthDay.day) || monthDay.day < 1 || monthDay.day > 31)) return "Invalid repeat. Use a day of the month from 1 to 31.";
    if (monthDay.kind === "weekday" && (![1, 2, 3, 4, -1].includes(monthDay.nth) || !Number.isInteger(monthDay.weekday) || monthDay.weekday < 0 || monthDay.weekday > 6)) return "Invalid repeat. Use the 1st to 4th or last weekday, with weekdays 0 to 6.";
  }
  if (rule.ends?.kind === "after" && (!Number.isInteger(rule.ends.count) || rule.ends.count < 1 || rule.ends.count > 1000)) return "Invalid repeat end. Repeat from 1 to 1000 times.";
  if (rule.ends?.kind === "on" && !isDate(rule.ends.date)) return "Invalid repeat end. Use YYYY-MM-DD for the last date.";
  return null;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(value: number): string {
  const teen = value % 100 >= 11 && value % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${suffix}`;
}
const joinWords = (words: readonly string[]) => (words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);
const sameSet = (left: readonly number[], right: readonly number[]) => [...new Set(left)].sort().join() === [...new Set(right)].sort().join();
const WORKDAYS = [1, 2, 3, 4, 5];

/** "on the 15th", "on the 2nd Tue", "on the last Fri", "on the last day". */
export function monthDayText(monthDay: MonthDay): string {
  if (monthDay.kind === "last_day") return "on the last day";
  if (monthDay.kind === "day") return `on the ${ordinal(monthDay.day)}`;
  return `on the ${monthDay.nth === -1 ? "last" : ordinal(monthDay.nth)} ${WEEKDAY_SHORT[monthDay.weekday] ?? ""}`;
}

/**
 * "Every weekday", "Every 2 weeks on Mon and Wed", "Every month on the last Fri",
 * "Every 3 days after done", "Every week until Fri 18 Dec", "Every day, 10 times".
 * Pass the task's date to name the month of a yearly rule.
 */
export function repeatRuleText(rule: RepeatRule, date?: string | null): string {
  const unit = rule.every === 1 ? rule.unit : `${rule.every} ${rule.unit}s`;
  let text = `Every ${unit}`;
  if (rule.unit === "week" && rule.weekdays?.length) {
    text = rule.every === 1 && sameSet(rule.weekdays, WORKDAYS)
      ? "Every weekday"
      : `${text} on ${joinWords([...rule.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => WEEKDAY_SHORT[day] ?? ""))}`;
  }
  if (rule.unit === "month" && rule.monthDay) text = `${text} ${monthDayText(rule.monthDay)}`;
  if (rule.unit === "year" && rule.monthDay && date) {
    const month = MONTH_SHORT[split(date).month - 1] ?? "";
    text = rule.monthDay.kind === "day" ? `${text} on ${rule.monthDay.day} ${month}` : `${text} ${monthDayText(rule.monthDay)} of ${month}`;
  }
  if (rule.basis === "completion") text = `${text} after done`;
  if (rule.ends?.kind === "on") {
    const end = rule.ends.date;
    text = `${text} until ${WEEKDAY_SHORT[getWeekday(end)]} ${split(end).day} ${MONTH_SHORT[split(end).month - 1]}`;
  }
  if (rule.ends?.kind === "after") text = `${text}, ${rule.ends.count === 1 ? "once" : `${rule.ends.count} times`}`;
  return text;
}

/** One-tap choices for a task on `date`, most common first. */
export function repeatPresets(date: string): { id: string; label: string; rule: RepeatRule }[] {
  const { day, month } = split(date);
  const { nth, weekday, isLast } = weekdayOfMonth(date);
  const name = WEEKDAY_SHORT[weekday] ?? "";
  const presets: { id: string; label: string; rule: RepeatRule }[] = [
    { id: "daily", label: "Daily", rule: { every: 1, unit: "day" } },
    { id: "weekdays", label: "Weekdays", rule: { every: 1, unit: "week", weekdays: WORKDAYS } },
    { id: "weekly", label: `Weekly on ${name}`, rule: { every: 1, unit: "week", weekdays: [weekday] } },
    { id: "monthly-day", label: `Monthly on the ${ordinal(day)}`, rule: { every: 1, unit: "month", monthDay: { kind: "day", day } } },
  ];
  if (nth <= 4) presets.push({ id: "monthly-nth", label: `Monthly on the ${ordinal(nth)} ${name}`, rule: { every: 1, unit: "month", monthDay: { kind: "weekday", nth: nth as 1 | 2 | 3 | 4, weekday } } });
  if (isLast) presets.push({ id: "monthly-last", label: `Monthly on the last ${name}`, rule: { every: 1, unit: "month", monthDay: { kind: "weekday", nth: -1, weekday } } });
  if (day === lastDayOfMonth(split(date).year, month)) presets.push({ id: "monthly-end", label: "Monthly on the last day", rule: { every: 1, unit: "month", monthDay: { kind: "last_day" } } });
  presets.push({ id: "yearly", label: `Yearly on ${day} ${MONTH_SHORT[month - 1]}`, rule: { every: 1, unit: "year", monthDay: { kind: "day", day } } });
  return presets;
}

/** Choices for which day a monthly or yearly rule lands on, for a task on `date`. */
export function monthDayChoices(date: string): { label: string; monthDay: MonthDay }[] {
  const { day, year, month } = split(date);
  const { nth, weekday, isLast } = weekdayOfMonth(date);
  const choices: { label: string; monthDay: MonthDay }[] = [{ label: `On the ${ordinal(day)}`, monthDay: { kind: "day", day } }];
  if (nth <= 4) choices.push({ label: `On the ${ordinal(nth)} ${WEEKDAY_SHORT[weekday]}`, monthDay: { kind: "weekday", nth: nth as 1 | 2 | 3 | 4, weekday } });
  if (isLast) choices.push({ label: `On the last ${WEEKDAY_SHORT[weekday]}`, monthDay: { kind: "weekday", nth: -1, weekday } });
  if (day === lastDayOfMonth(year, month)) choices.push({ label: "On the last day", monthDay: { kind: "last_day" } });
  return choices;
}

export const sameRule = (left: RepeatRule | null, right: RepeatRule | null): boolean => JSON.stringify(normal(left)) === JSON.stringify(normal(right));
function normal(rule: RepeatRule | null) {
  if (!rule) return null;
  return { every: rule.every, unit: rule.unit, weekdays: rule.weekdays ? [...new Set(rule.weekdays)].sort() : null, monthDay: rule.monthDay ?? null, basis: rule.basis ?? "schedule", ends: rule.ends ?? null };
}
