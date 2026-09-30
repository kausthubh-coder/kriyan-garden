import { addDays, getWeekday, toIsoDate } from "@kriyan/core";
import type { Doc } from "../_generated/dataModel";
export function nextDate(value: string, rule: NonNullable<Doc<"tasks">["repeat"]>) {
  if (rule.unit === "day") return addDays(value, rule.every);
  if (rule.unit === "week") {
    if (!rule.weekdays) return addDays(value, rule.every * 7);
    const currentDay = (getWeekday(value) + 6) % 7;
    const later = rule.weekdays.map((day) => (day + 6) % 7).sort((a, b) => a - b).find((day) => day > currentDay);
    if (later !== undefined) return addDays(value, later - currentDay);
    const first = Math.min(...rule.weekdays.map((day) => (day + 6) % 7));
    return addDays(value, rule.every * 7 - currentDay + first);
  }
  const [year, month, day] = value.split("-").map(Number);
  const offset = rule.unit === "month" ? rule.every : rule.every * 12;
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return toIsoDate(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(day, lastDay));
}
