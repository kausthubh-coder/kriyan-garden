import type { Task } from "./types";

/** Only locally generated optimistic keys are skipped; Convex validates IDs. */
export function taskSelectionArgs(key: string | null, authenticated = true): { key: string } | "skip" {
  return key && authenticated && !key.startsWith("optimistic-") ? { key } : "skip";
}

/** Match useQuery: undefined while loading/skipped, null when unavailable. */
export function selectTask(key: string | null, tasks: readonly Task[] | undefined): Task | null | undefined {
  if (taskSelectionArgs(key) === "skip" || tasks === undefined) return undefined;
  return tasks.find((task) => task._id === key) ?? null;
}
