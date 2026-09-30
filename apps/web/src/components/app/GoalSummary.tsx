import type { ReactNode } from "react";
import { shortDate, countText, goalProgress } from "@kriyan/core";
import type { Area, Goal, Variables } from "./types";
import { areaColor } from "./types";
import s from "./App.module.css";

export function GoalSummary({goal, areas, today, open}: {goal: Goal; areas: Area[]; today: string; open?: (goal: Goal) => void}) {
  const metric = goal.metric, progress = goalProgress(goal, today);
  return <div className={s.goalSummary} style={{"--c": areaColor(areas.find(area => area._id === goal.areaId)), "--p": progress.progress * 100, "--e": (progress.expected ?? 0) * 100} as Variables}>
      <GoalHeading goal={goal} open={open}>
        <span className={s.goalValue}>
          <b>
            {metric.kind === "number"
              ? metric.current
              : Math.round(progress.progress * 100)}
          </b>
          <small>{metric.kind === "number" ? metric.unit : "%"}</small>
        </span>
        <span className={s.goalName}>
          {goal.title}
          <small>
            <i className={s.dot} />
            {areas.find((a) => a._id === goal.areaId)?.name},{" "}
            {goal.targetDate
              ? `due ${shortDate(goal.targetDate)}`
              : "no target date"}
          </small>
        </span>
        <span
          className={`${s.goalStatus} ${progress.status === "Behind pace" || progress.status === "Late" ? s.bad : ""}`}
        >
          {goal.status === "active"
            ? progress.status
            : goal.status === "done"
              ? "Done"
              : "Archived"}
        </span>
      </GoalHeading>
      <div
        className={s.pace}
        role="progressbar"
        aria-label={`${goal.title} progress`}
        aria-valuenow={Math.round(progress.progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i />
        {progress.expected !== null && <u title="Where you should be today" />}
      </div>
      <p>
        {progress.expected !== null
          ? `You should be at ${Math.round(progress.expected * 100)}% today.`
          : "Set a target date to show your pace."}{" "}
        {goal.milestones.length
          ? `${goal.milestones.filter((milestone) => milestone.doneAt !== null).length} of ${countText(goal.milestones.length, "milestone")} done.`
          : metric.kind === "number"
            ? `Target ${metric.target}${metric.unit ? `${metric.unit === "%" ? "" : " "}${metric.unit}` : ""}.`
            : `${progress.done} of ${countText(progress.total, metric.kind === "milestones" ? "milestone" : "linked task")} done.`}
      </p>
  </div>;
}
function GoalHeading({goal, open, children}: {goal: Goal; open?: (goal: Goal) => void; children: ReactNode}) {
  return open ? <button className={s.goalHeader} onClick={() => open(goal)} aria-label={goal.title}>{children}</button> : <div className={s.goalHeader}>{children}</div>;
}
