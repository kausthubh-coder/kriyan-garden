import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import type { Goal } from "./types";

/** Keep selection on the reactive list, including stale URLs after deletion. */
export function selectGoal(key: string | null, goals: readonly Goal[] | undefined): Doc<"goals"> | undefined {
  if (!key || key.startsWith("optimistic-")) return undefined;
  const row = goals?.find((goal) => goal._id === key);
  return row ? goalValue(row) : undefined;
}

/** The backend get/snapshot value excludes list-only progress and milestones. */
export const goalValue = (row: Goal): Doc<"goals"> => ({
  _id: row._id, _creationTime: row._creationTime, ownerId: row.ownerId, createdAt: row.createdAt, updatedAt: row.updatedAt,
  areaId: row.areaId, title: row.title, note: row.note, startDate: row.startDate, targetDate: row.targetDate,
  metric: row.metric, status: row.status, sortOrder: row.sortOrder,
});
