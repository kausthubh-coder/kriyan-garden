/** A forgiving clock entry. Empty is allowed; null means invalid. */
export function parseTimeInput(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!value) return "";
  const match = /^(\d{1,2})(?:[:.](\d{1,2}))?(am|pm)?$/.exec(value);
  const compact = /^(\d{1,2})(\d{2})(am|pm)?$/.exec(value);
  const parts = compact ?? match;
  if (!parts) return null;
  let hour = Number(parts[1]);
  const minute = Number(parts[2] ?? 0);
  const period = parts[3];
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) hour = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
