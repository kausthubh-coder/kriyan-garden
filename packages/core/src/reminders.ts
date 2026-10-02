import { Temporal } from "@js-temporal/polyfill";
import { addDays } from "./dates";

export type Reminder =
  | { type: "at_start" }
  | { type: "before"; minutes: number }
  | { type: "morning_of" }
  | { type: "day_before" }
  | { type: "at_time"; time: string }
  /** Counts back from the task's deadline, so homework with no planned day still reminds. */
  | { type: "deadline"; daysBefore: number; time: string };

type ReminderTask = {
  date: string | null;
  time: string | null;
  deadline?: string | null;
  reminders: readonly Reminder[];
};
export type ReminderFire = { at: number; about: "date" | "deadline" };

/** When each reminder fires and whether it is about the planned day or the deadline. Calendar days use the profile timezone; gaps shift forward and folds use the first occurrence. */
export function reminderFires(task: ReminderTask, timezone: string, now: number): ReminderFire[] {
  const fires = task.reminders.flatMap((reminder): ReminderFire[] => {
    let date: string | null, time: string | null, about: ReminderFire["about"] = "date";
    if (reminder.type === "deadline") {
      if (!task.deadline) return [];
      date = addDays(task.deadline, -reminder.daysBefore);
      time = reminder.time;
      about = "deadline";
    } else {
      if (!task.date) return [];
      if ((reminder.type === "at_start" || reminder.type === "before") && !task.time) return [];
      date = reminder.type === "day_before" ? addDays(task.date, -1) : task.date;
      time = reminder.type === "morning_of" ? "09:00" : reminder.type === "day_before" ? "18:00" : reminder.type === "at_time" ? reminder.time : task.time;
    }
    if (!time) return [];
    const instant = Temporal.ZonedDateTime.from(`${date}T${time}[${timezone}]`, { disambiguation: "compatible" }).epochMilliseconds;
    const at = instant - (reminder.type === "before" ? reminder.minutes * 60_000 : 0);
    return at > now ? [{ at, about }] : [];
  });
  const unique = new Map<number, ReminderFire>();
  for (const fire of fires.sort((a, b) => a.at - b.at)) if (!unique.has(fire.at)) unique.set(fire.at, fire);
  return [...unique.values()];
}

/** The next instant after `now` when the clock reads `time` in `timezone`. */
export function nextDailyAt(time: string, timezone: string, now: number): number {
  const local = Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(timezone).toPlainDate();
  for (let offset = 0; offset < 3; offset++) {
    const at = Temporal.ZonedDateTime.from(`${local.add({ days: offset }).toString()}T${time}[${timezone}]`, { disambiguation: "compatible" }).epochMilliseconds;
    if (at > now) return at;
  }
  return now + 86_400_000;
}

/** Daily summary text: "4 tasks today, 2 due this week." */
export function summaryText(today: number, dueThisWeek: number): string {
  const planned = today === 0 ? "Nothing planned today" : `${today} ${today === 1 ? "task" : "tasks"} today`;
  return dueThisWeek === 0 ? `${planned}.` : `${planned}, ${dueThisWeek} due this week.`;
}

export function reminderTimes(task: ReminderTask, timezone: string, now: number): number[] {
  return reminderFires(task, timezone, now).map((fire) => fire.at);
}

/** A sentence saying what to fix, or null when every reminder can fire for this task. */
export function reminderProblem(task: ReminderTask): string | null {
  if (task.reminders.length > 8) return "Invalid reminder. Use at most 8 reminders.";
  for (const reminder of task.reminders) {
    if (reminder.type === "deadline") {
      if (!Number.isInteger(reminder.daysBefore) || reminder.daysBefore < 0 || reminder.daysBefore > 30) return "Invalid reminder. Remind 0 to 30 days before the deadline.";
      if (!task.deadline) return "Invalid reminder. Set a deadline before adding deadline reminders.";
      continue;
    }
    if (reminder.type === "before" && (!Number.isFinite(reminder.minutes) || reminder.minutes < 1 || reminder.minutes > 10080)) return "Invalid reminder. Remind 1 minute to 7 days before.";
    if (!task.date) return "Invalid reminder. Set a date before adding reminders.";
    if ((reminder.type === "at_start" || reminder.type === "before") && !task.time) return "Invalid reminder. Set a time for at_start or before reminders.";
  }
  return null;
}

/** Deadline reminder choices: on the day in the morning, or evenings before. */
export const deadlineReminderPresets: { label: string; reminder: Reminder }[] = [
  { label: "Deadline day", reminder: { type: "deadline", daysBefore: 0, time: "09:00" } },
  { label: "1 day before deadline", reminder: { type: "deadline", daysBefore: 1, time: "18:00" } },
  { label: "2 days before deadline", reminder: { type: "deadline", daysBefore: 2, time: "18:00" } },
  { label: "1 week before deadline", reminder: { type: "deadline", daysBefore: 7, time: "18:00" } },
];
