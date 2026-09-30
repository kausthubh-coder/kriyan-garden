const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Format calendar components, with a one-based month. */
export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// UTC is only an arithmetic coordinate for the supplied calendar date.
// No clock or timezone is consulted, so DST cannot shift a calendar day.
function calendarDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addDays(date: string, days: number): string {
  const value = calendarDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return toIsoDate(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
  );
}

/** Sunday is 0, Saturday is 6. */
export function getWeekday(date: string): number {
  return calendarDate(date).getUTCDay();
}

export function weekdayIndex(name: string): number {
  return weekdays.findIndex((day) => day === name.toLowerCase().slice(0, 3));
}

/** Use the user's timezone, defaulting to the current device's timezone. */
export function localClock(now: Date, timezone?: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === name)?.value ?? "00";
  return {
    today: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}
