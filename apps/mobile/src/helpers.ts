import { layout, timeOf } from "@kriyan/core";

export function snapTime(
  y: number,
  startHour: number,
  endHour: number,
  duration: number | null = null,
) {
  const minute =
    Math.round((startHour * 60 + (y * 60) / layout.hourHeight) / 15) * 15;
  return timeOf(
    Math.max(
      startHour * 60,
      Math.min(endHour * 60 - Math.max(15, duration ?? 15), minute),
    ),
  );
}
export function snapLength(y: number) {
  return Math.max(
    15,
    Math.min(1440, Math.round((y * 60) / layout.hourHeight / 15) * 15),
  );
}
export const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" });
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
