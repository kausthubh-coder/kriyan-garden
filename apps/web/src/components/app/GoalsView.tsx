"use client";
import { useState } from "react";
import { goalProgress } from "@kriyan/core";
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
import { areaColor, longDate, type Goal, type Variables } from "./types";
import s from "./App.module.css";
type GoalsProps = ViewProps & { openGoal: (goal: Goal) => void };
export function GoalsView(p: GoalsProps) {
  const [adding, setAdding] = useState(false);
  const goals = p.goals.filter(
    (g) => p.filter === "all" || g.areaId === p.filter,
  );
  return (
    <main className={s.page}>
      <ViewHeader
        title="Goals"
        subtitle={`${goals.filter((g) => g.status === "active").length} active`}
      />
      <Filters areas={p.areas} filter={p.filter} onChange={p.setFilter} />
      <button
        className={s.btn}
        onClick={() => setAdding(true)}
        disabled={!p.areas.length}
      >
        Add goal
      </button>
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
      <div className={s.gt}>
        <button
          className={s.goalValue}
          onClick={() => p.openGoal(goal)}
          aria-label={`Open goal progress: ${goal.title}`}
        >
          <b>
            {metric.kind === "number"
              ? `${metric.current}${metric.unit === "%" ? "" : " "}${metric.unit}`
              : `${Math.round(progress.progress * 100)}%`}
          </b>
        </button>
        <div>
          <button className={s.goalTitle} onClick={() => p.openGoal(goal)}>
            {goal.title}
          </button>
          <small>
            {p.areas.find((a) => a._id === goal.areaId)?.name}.{" "}
            {metric.kind === "number"
              ? `Target ${metric.target}${metric.unit === "%" ? "" : " "}${metric.unit}. `
              : `${progress.done} of ${progress.total} done. `}
            {goal.targetDate
              ? `Due ${longDate(goal.targetDate)}`
              : "No target date"}
          </small>
        </div>
        {goal.targetDate && (
          <span
            className={
              progress.status === "Behind pace" || progress.status === "Late"
                ? s.bad
                : undefined
            }
          >
            {goal.status === "active"
              ? progress.status
              : goal.status === "done"
                ? "Done"
                : "Archived"}
          </span>
        )}
      </div>
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
          ? "The marker shows where you should be today."
          : "Set a target date to show your pace."}{" "}
        {goal.linkedTasks.done} of {goal.linkedTasks.total} linked tasks done.
      </p>
      {goal.milestones.length > 0 && (
        <ul className={s.milestoneList} aria-label="Milestones">
          {goal.milestones.map((m) => (
            <li key={m._id}>
              <span>{m.doneAt !== null ? "Done" : "To do"}</span>{" "}
              {m.doneAt !== null ? <s>{m.title}</s> : m.title}
              {m.targetDate && <small>Due {longDate(m.targetDate)}</small>}
            </li>
          ))}
        </ul>
      )}
      <button
        className={s.f}
        onClick={() => p.openGoal(goal)}
        aria-label={`Open goal details: ${goal.title}`}
      >
        Details
      </button>
      {linked.map((task) => (
        <TaskRow {...p} task={task} withDate key={task._id} />
      ))}
      {!linked.length && (
        <p>No linked tasks yet. Open a task and choose this goal.</p>
      )}
    </section>
  );
}
