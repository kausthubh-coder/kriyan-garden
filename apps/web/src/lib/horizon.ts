import type { Horizon } from "@/lib/types";

// Both arguments are local calendar days (YYYY-MM-DD).
export function getHorizonFromDueDate(date: string | null, today: string): Horizon {
  if (!date) return "someday";
  const due = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(due)) return "someday";
  const daysAway = Math.round((due - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (daysAway <= 7) return "now";
  if (daysAway <= 90) return "season";
  return "someday";
}
