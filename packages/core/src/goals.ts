import { toIsoDate } from "./dates";

/** Presets use the person's calendar date, including month-end clamping. */
export function goalTargetDates(today: string) {
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7)), day = Number(today.slice(8, 10));
  const end = new Date(Date.UTC(year, month, 0));
  const later = new Date(Date.UTC(year, month + 2, 1));
  const last = new Date(Date.UTC(later.getUTCFullYear(), later.getUTCMonth() + 1, 0)).getUTCDate();
  return [toIsoDate(year, month, end.getUTCDate()),
    toIsoDate(later.getUTCFullYear(), later.getUTCMonth() + 1, Math.min(day, last)),
    toIsoDate(year, 12, 31)] as const;
}

type GoalProgress = {
  startDate: string;
  targetDate: string | null;
  metric:
    | { kind: "tasks" }
    | { kind: "milestones" }
    | { kind: "number"; current: number; target: number; unit: string };
  linkedTasks: { total: number; done: number };
  milestones: readonly { doneAt: number | null }[];
};
/** Calendar dates are arithmetic coordinates. Today is supplied by the client. */
export function goalProgress(goal: GoalProgress, today: string) {
  const total =
    goal.metric.kind === "number"
      ? goal.metric.target
      : goal.metric.kind === "tasks"
        ? goal.linkedTasks.total
        : goal.milestones.length;
  const done =
    goal.metric.kind === "number"
      ? goal.metric.current
      : goal.metric.kind === "tasks"
        ? goal.linkedTasks.done
        : goal.milestones.filter((m) => m.doneAt !== null).length;
  const progress = total > 0 ? Math.max(0, Math.min(done / total, 1)) : 0;
  const start = Date.parse(goal.startDate),
    end = goal.targetDate ? Date.parse(goal.targetDate) : null;
  const expected =
    end === null
      ? null
      : end <= start
        ? today >= (goal.targetDate ?? today)
          ? 1
          : 0
        : Math.max(0, Math.min((Date.parse(today) - start) / (end - start), 1));
  const status =
    progress >= 1
      ? "Complete"
      : expected === null
        ? "No target date"
        : progress < expected
          ? today > (goal.targetDate ?? today)
            ? "Late"
            : "Behind pace"
          : progress > expected
            ? "Ahead"
            : "On pace";
  return { total, done, progress, expected, status };
}
