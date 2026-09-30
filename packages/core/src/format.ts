import { addDays, getWeekday } from "./dates";
import { formatMinutes, minutesOf, timeOf } from "./planning";
import type { Reminder } from "./reminders";

/**
 * Text shown to people for dates, times, repeats and reminders.
 * Web, Android, the CLI and MCP read-backs all use these, so a date never
 * appears as a raw ISO string or in a browser's native format.
 * No locale APIs are used: output is identical on every platform.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type RepeatRule = {
  every: number;
  unit: "day" | "week" | "month" | "year";
  weekdays?: readonly number[];
};

const parts = (date: string) => ({
  day: Number(date.slice(8, 10)),
  month: Number(date.slice(5, 7)) - 1,
});

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
  );
}

/** "Wednesday" */
export const weekdayName = (date: string): string => WEEKDAYS[getWeekday(date)] ?? "";

/** "30 September" */
export function longDate(date: string): string {
  const { day, month } = parts(date);
  return `${day} ${MONTHS[month] ?? ""}`;
}

/** "Wed 30 Sep" */
export function shortDate(date: string): string {
  const { day, month } = parts(date);
  return `${weekdayName(date).slice(0, 3)} ${day} ${(MONTHS[month] ?? "").slice(0, 3)}`;
}

/** Creation date in the viewer's local timezone: "29 Sep". */
export function addedDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${(MONTHS[date.getMonth()] ?? "").slice(0, 3)}`;
}

/** "Today", "Tomorrow", "Yesterday", otherwise "Wed 30 Sep". */
export function relativeDay(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return shortDate(date);
}

/** Value for a task's Day row: "Today, Wed 30 Sep", "Fri 2 Oct" or "No date yet". */
export function dayValue(date: string | null, today: string): string {
  if (!date) return "No date yet";
  const relative = relativeDay(date, today);
  return relative === shortDate(date) ? relative : `${relative}, ${shortDate(date)}`;
}

/** Value for a task's Time row: "14:30 to 15:30", "14:30" or "Any time". */
export function timeValue(time: string | null, durationMinutes: number | null): string {
  if (!time) return "Any time";
  return durationMinutes ? `${time} to ${timeOf(minutesOf(time) + durationMinutes)}` : time;
}

/** Value for a task's Length row: "1h 30m" or "None". */
export const lengthValue = (durationMinutes: number | null): string =>
  durationMinutes ? formatMinutes(durationMinutes) : "None";

/**
 * Value for a Deadline row. `urgent` is true when the deadline is overdue or
 * within seven days; show it in the status colour and keep the words.
 */
export function deadlineValue(
  deadline: string | null,
  today: string,
): { text: string; urgent: boolean } {
  if (!deadline) return { text: "None", urgent: false };
  const days = daysBetween(today, deadline);
  const when =
    days === 0 ? "today"
    : days === 1 ? "tomorrow"
    : days === -1 ? "yesterday"
    : days > 1 ? `in ${days} days`
    : `${-days} days ago`;
  return { text: `${shortDate(deadline)}, ${when}`, urgent: days <= 7 };
}

const joinWords = (words: readonly string[]): string =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** "Does not repeat", "Every day", "Every 2 weeks on Mon and Thu", "Every month". */
export function repeatText(repeat: RepeatRule | null): string {
  if (!repeat) return "Does not repeat";
  const unit = repeat.every === 1 ? repeat.unit : `${repeat.every} ${repeat.unit}s`;
  const days =
    repeat.unit === "week" && repeat.weekdays?.length
      ? ` on ${joinWords(
          [...repeat.weekdays]
            // Monday first, Sunday last.
            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
            .map((day) => (WEEKDAYS[day] ?? "").slice(0, 3)),
        )}`
      : "";
  return `Every ${unit}${days}`;
}

/** One reminder in words: "At start", "10 min before", "1 hour before", "Morning of", "Day before", "At 08:00". */
export function reminderText(reminder: Reminder): string {
  switch (reminder.type) {
    case "at_start":
      return "At start";
    case "before": {
      const { minutes } = reminder;
      if (minutes % 1440 === 0) return `${minutes / 1440} ${minutes === 1440 ? "day" : "days"} before`;
      if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hour" : "hours"} before`;
      return `${minutes} min before`;
    }
    case "morning_of":
      return "Morning of";
    case "day_before":
      return "Day before";
    case "at_time":
      return `At ${reminder.time}`;
  }
}

/** Value for a Reminders row: "10 min before, at start" or "None". */
export function remindersValue(reminders: readonly Reminder[]): string {
  if (!reminders.length) return "None";
  return reminders
    .map(reminderText)
    .map((text, index) => (index === 0 ? text : text.charAt(0).toLowerCase() + text.slice(1)))
    .join(", ");
}

/** "1 task", "3 tasks". */
export const countText = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** A named city and its current offset, including daylight saving. */
export function timezoneValue(timezone: string, at: number = Date.now()): string {
  const city = timezone.split("/").at(-1)?.replace(/_/g, " ") ?? timezone;
  const offset = new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "shortOffset" }).formatToParts(at).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return `${city} (${offset.replace("GMT", "UTC").replace("-", "−")})`;
}

/** Monday-first summary of a class or meeting. */
export function eventValue(event: { weekdays: readonly number[]; startTime: string; endTime: string; location: string; untilDate: string | null }): string {
  const days = [...event.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => (WEEKDAYS[day] ?? "").slice(0, 3)).join(", ");
  return `${days} ${timeValue(event.startTime, null)} to ${timeValue(event.endTime, null)}${event.location ? `, ${event.location}` : ""}${event.untilDate ? `, until ${shortDate(event.untilDate).slice(4)}` : ""}`;
}

/** Day summary line: "7 tasks left, 4h 5m planned, 2 with no length." or "Nothing planned." */
export function daySummary(input: {
  left: number;
  total: number;
  plannedMinutes: number;
  withoutLength: number;
}): string {
  if (input.total === 0) return "Nothing planned.";
  const bits = [`${countText(input.left, "task")} left`];
  if (input.plannedMinutes) bits.push(`${formatMinutes(input.plannedMinutes)} planned`);
  if (input.withoutLength) bits.push(`${input.withoutLength} with no length`);
  return `${bits.join(", ")}.`;
}
