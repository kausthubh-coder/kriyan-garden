"use client";
import { useState } from "react";
import { useGoalActions } from "./dataAccess";
import { goalProgress } from "@kriyan/core";
import { Filters } from "./Filters";
import { Dialog } from "./Dialog";
import { GoalForm } from "./GoalForm";
import { useFormAction } from "./useFormAction";
import {
  TaskRow,
  ViewHeader,
  ViewSkeleton,
  sortTasks,
  type ViewProps,
} from "./ViewParts";
import { areaColor, longDate, type Goal, type Variables } from "./types";
import s from "./App.module.css";
export function GoalsView(p: ViewProps) {
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
function GoalCard(p: ViewProps & { goal: Goal }) {
  const { goal } = p,
    metric = goal.metric,
    progress = goalProgress(goal, p.today),
    action = useFormAction();
  const { update, createMilestone, updateMilestone, removeMilestone } = useGoalActions();
  const [editing, setEditing] = useState(false);
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
        <b>
          {metric.kind === "number"
            ? `${metric.current}${metric.unit === "%" ? "" : " "}${metric.unit}`
            : `${Math.round(progress.progress * 100)}%`}
        </b>
        <div>
          {goal.title}
          <small>
            {p.areas.find((a) => a._id === goal.areaId)?.name}.{" "}
            {goal.targetDate
              ? `Due ${longDate(goal.targetDate)}`
              : "No target date"}
          </small>
        </div>
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
      {metric.kind === "number" && (
        <form
          className={s.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            const current = Number(
              new FormData(e.currentTarget).get("current"),
            );
            void action.run(() =>
              update({
                id: goal._id,
                patch: { metric: { ...metric, current } },
              }),
            );
          }}
        >
          <label>
            Current value for {goal.title}
            <input
              name="current"
              type="number"
              step="any"
              required
              defaultValue={metric.current}
              key={metric.current}
            />
          </label>
          <button className={s.f} disabled={action.busy}>
            Update progress
          </button>
        </form>
      )}
      <div className={s.inlineForm}>
        <label>
          Status for {goal.title}
          <select
            value={goal.status}
            disabled={action.busy}
            onChange={(e) => {
              const status = e.target.value as Goal["status"];
              void action.run(() =>
                update({ id: goal._id, patch: { status } }),
              );
            }}
          >
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button className={s.f} onClick={() => setEditing(!editing)}>
          {editing ? "Close milestones" : "Edit milestones"}
        </button>
      </div>
      {goal.milestones.map((m) => (
        <div key={m._id} className={s.milestone}>
          <button
            className={s.f}
            role="checkbox"
            aria-checked={m.doneAt !== null}
            aria-label={`Complete milestone: ${m.title}`}
            disabled={action.busy}
            onClick={() =>
              void action.run(() =>
                updateMilestone({
                  id: m._id,
                  patch: { doneAt: m.doneAt === null ? Date.now() : null },
                }),
              )
            }
          >
            {m.doneAt !== null ? "Done" : "Mark done"}
          </button>
          {editing ? (
            <form
              className={s.inlineForm}
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void action.run(() =>
                  updateMilestone({
                    id: m._id,
                    patch: {
                      title: String(d.get("title")),
                      targetDate: String(d.get("date")) || null,
                    },
                  }),
                );
              }}
            >
              <label>
                Milestone title
                <input name="title" defaultValue={m.title} required />
              </label>
              <label>
                Milestone date
                <input
                  name="date"
                  type="date"
                  defaultValue={m.targetDate ?? ""}
                />
              </label>
              <button className={s.f} disabled={action.busy}>
                Save milestone
              </button>
              <button
                type="button"
                className={s.f}
                disabled={action.busy}
                onClick={() =>
                  void action.run(() => removeMilestone({ id: m._id }))
                }
              >
                Delete milestone
              </button>
            </form>
          ) : (
            <span>
              {m.title}
              {m.targetDate ? `, ${longDate(m.targetDate)}` : ""}
            </span>
          )}
        </div>
      ))}
      {editing && (
        <form
          className={s.inlineForm}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            if (
              await action.run(() =>
                createMilestone({
                  goalId: goal._id,
                  title: String(d.get("title")),
                  targetDate: String(d.get("date")) || null,
                  sortOrder: goal.milestones.length,
                }),
              )
            )
              form.reset();
          }}
        >
          <label>
            New milestone
            <input name="title" required maxLength={180} />
          </label>
          <label>
            Target date
            <input name="date" type="date" />
          </label>
          <button className={s.f} disabled={action.busy}>
            Add milestone
          </button>
        </form>
      )}
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
      {linked.map((task) => (
        <TaskRow {...p} task={task} withDate key={task._id} />
      ))}
      {!linked.length && (
        <p>No linked tasks yet. Open a task and choose this goal.</p>
      )}
    </section>
  );
}
