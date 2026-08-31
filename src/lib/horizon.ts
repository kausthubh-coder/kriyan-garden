import type { Horizon } from "@/lib/types";

export function getHorizonFromDueDate(date: string): Horizon {
  if (!date) return "someday";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  const daysAway = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (daysAway <= 7) return "now";
  if (daysAway <= 90) return "season";
  return "someday";
}
