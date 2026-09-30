import { Temporal } from "@js-temporal/polyfill";
import { addDays } from "./dates";

export type Reminder =
  | { type: "at_start" }
  | { type: "before"; minutes: number }
  | { type: "morning_of" }
  | { type: "day_before" }
  | { type: "at_time"; time: string };

/** Calendar days use the profile timezone. Gaps shift forward; folds use the first occurrence. */
export function reminderTimes(
  task: {
    date: string | null;
    time: string | null;
    reminders: readonly Reminder[];
  },
  timezone: string,
  now: number,
): number[] {
  if (!task.date) return [];
  const times = task.reminders.flatMap((reminder) => {
    if (
      (reminder.type === "at_start" || reminder.type === "before") &&
      !task.time
    )
      return [];
    const date =
      reminder.type === "day_before" ? addDays(task.date ?? "", -1) : task.date;
    const time =
      reminder.type === "morning_of"
        ? "09:00"
        : reminder.type === "day_before"
          ? "18:00"
          : reminder.type === "at_time"
            ? reminder.time
            : task.time;
    if (!time) return [];
    const instant = Temporal.ZonedDateTime.from(
      `${date}T${time}[${timezone}]`,
      { disambiguation: "compatible" },
    ).epochMilliseconds;
    const fireAt =
      instant - (reminder.type === "before" ? reminder.minutes * 60_000 : 0);
    return fireAt > now ? [fireAt] : [];
  });
  return [...new Set(times)].sort((a, b) => a - b);
}
