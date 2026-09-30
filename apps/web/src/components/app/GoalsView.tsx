"use client";
import { shortDate } from "@kriyan/core";
import { useState } from "react";
import { countText, goalProgress } from "@kriyan/core";
import { Icon } from "./Icon";
import { Filters } from "./Filters";
import { Dialog } from "./Dialog";
import { GoalForm } from "./GoalForm";
import {
  TaskRow,
  ViewHeader,
  ViewSkeleton,
  sortTasks,
  type ViewProps,
} from "./ViewParts";
import { areaColor, type Goal, type Variables } from "./types";
import s from "./App.module.css";
type GoalsProps = ViewProps & { openGoal: (goal: Goal) => void };
export function GoalsView(p: GoalsProps) {
  const [adding, setAdding] = useState(false);
  const goals = p.goals.filter(
    (g) => p.filter === "all" || g.areaId === p.filter,
  );
  return (
    <main className={`${s.page} ${s.goalsPage}`}>
      <ViewHeader
        title="Goals"
        subtitle={`${goals.filter((g) => g.status === "active").length} active`}
        actions={
          <button
            className={`${s.btn} ${s.ghosty}`}
            onClick={() => setAdding(true)}
            disabled={!p.areas.length}
          >
            <Icon name="plus" />
            Add goal
          </button>
        }
      />
      <Filters areas={p.areas} filter={p.filter} onChange={p.setFilter} />
      {p.loading ? (
        <ViewSkeleton kind="goals" />
      ) : goals.length ? (
        goals.map((goal) => <GoalCard {...p} goal={goal} key={goal._id} />)
      ) : (
        <div className={s.empty}>
          No goals in this area yet.{" "}
          <button onClick={() => setAdding(true)}>Add goal</button>
        </div>
      )}
      {adding && (
        <Dialog
          className={s.goalDialog}
          label="Add goal"
          close={() => setAdding(false)}
          initialFocus='input[name="title"]'
        >
          <div className={s.formHeading}>
            <h2>Add goal</h2>
            <button className={s.f} onClick={() => setAdding(false)}>
              Close dialog
            </button>
          </div>
          <GoalForm
            areas={p.areas}
            today={p.today}
            saved={() => setAdding(false)}
          />
        </Dialog>
      )}
    </main>
  );
}
function GoalCard(p: GoalsProps & { goal: Goal }) {
  const { goal } = p,
    metric = goal.metric,
    progress = goalProgress(goal, p.today);
  const linked = p.tasks
    .filter((t) => t.goalId === goal._id)
    .sort(
      (a, b) =>
        Number(a.status === "completed") - Number(b.status === "completed") ||
        (a.date ?? "9").localeCompare(b.date ?? "9") ||
        sortTasks(a, b),
    );
  return (
    <section
      className={s.gcard}
      style={
        {
          "--c": areaColor(p.areas.find((a) => a._id === goal.areaId)),
          "--p": progress.progress * 100,
          "--e": (progress.expected ?? 0) * 100,
        } as Variables
      }
    >
      <button
        className={s.goalHeader}
        onClick={() => p.openGoal(goal)}
        aria-label={goal.title}
      >
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
            {p.areas.find((a) => a._id === goal.areaId)?.name},{" "}
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
      </button>
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
      {goal.milestones.length > 0 && (
        <ul className={s.milestoneList} aria-label="Milestones">
          {goal.milestones.map((m) => (
            <li key={m._id} className={m.doneAt !== null ? s.done : undefined}>
              {m.doneAt !== null ? <s>{m.title}</s> : m.title}
              <span className={s.sr}>
                {m.doneAt !== null ? "Done" : "To do"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {linked.map((task) => (
        <TaskRow {...p} task={task} withDate linked key={task._id} />
      ))}
      {!linked.length && (
        <p>No linked tasks yet. Open a task and choose this goal.</p>
      )}
    </section>
  );
}
