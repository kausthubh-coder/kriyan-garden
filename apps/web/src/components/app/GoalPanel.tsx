"use client";
import { useState } from "react";
import { useGoalTransport } from "./dataAccess";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { useFormAction } from "./useFormAction";
import type { Area, Goal } from "./types";
import s from "./App.module.css";

export function GoalPanel({
  goal,
  areas,
  close,
  remove,
}: {
  goal: Goal;
  areas: Area[];
  close: () => void;
  remove: (goal: Goal) => Promise<void>;
}) {
  const { update, createMilestone, updateMilestone, removeMilestone } = useGoalTransport();
  const action = useFormAction();
  const [kind, setKind] = useState(goal.metric.kind);
  return (
    <Dialog
      label="Goal details"
      className={s.panel}
      close={close}
      initialFocus='input[name="title"]'
    >
      <div className={s.ph}>
        Goal details
        <button onClick={close} aria-label="Close goal details">
          <Icon name="close" />
        </button>
      </div>
      <form
        className={s.form}
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await action.run(() =>
            update({
              id: goal._id,
              patch: {
                title: String(data.get("title")),
                areaId: String(data.get("area")) as Id<"areas">,
                targetDate: String(data.get("targetDate")) || null,
                startDate: String(data.get("startDate")),
                status: String(data.get("status")) as Goal["status"],
                note: String(data.get("note")),
                metric:
                  kind === "number"
                    ? {
                        kind,
                        current: Number(data.get("current")),
                        target: Number(data.get("target")),
                        unit: String(data.get("unit")),
                      }
                    : { kind },
              },
            }),
          );
        }}
      >
        <fieldset disabled={action.busy}>
          <label>
            Goal title
            <input
              name="title"
              defaultValue={goal.title}
              required
              maxLength={120}
            />
          </label>
          <label>
            Area
            <select name="area" defaultValue={goal.areaId} required>
              {areas.map((area) => (
                <option key={area._id} value={area._id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target date
            <input
              name="targetDate"
              type="date"
              defaultValue={goal.targetDate ?? ""}
            />
          </label>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={goal.startDate}
              required
            />
          </label>
          <label>
            Measure progress
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as Goal["metric"]["kind"])
              }
            >
              <option value="tasks">Linked tasks</option>
              <option value="number">Number</option>
              <option value="milestones">Milestones</option>
            </select>
          </label>
          {kind === "number" && (
            <>
              <label>
                Current value
                {goal.metric.kind === "number" && ` (${goal.metric.unit})`}
                <input
                  name="current"
                  type="number"
                  step="any"
                  required
                  defaultValue={
                    goal.metric.kind === "number" ? goal.metric.current : 0
                  }
                />
              </label>
              <label>
                Target value
                <input
                  name="target"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  defaultValue={
                    goal.metric.kind === "number" ? goal.metric.target : 100
                  }
                />
              </label>
              <label>
                Unit
                <input
                  name="unit"
                  required
                  maxLength={48}
                  defaultValue={
                    goal.metric.kind === "number" ? goal.metric.unit : ""
                  }
                />
              </label>
            </>
          )}
          <label>
            Status
            <select name="status" defaultValue={goal.status}>
              <option value="active">Active</option>
              <option value="done">Done</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            Note
            <textarea
              name="note"
              defaultValue={goal.note}
              maxLength={180}
              rows={3}
            />
          </label>
          <button className={s.btn}>Save goal</button>
        </fieldset>
      </form>
      <section className={s.form} aria-label="Milestones editor">
        <h2>Milestones</h2>
        {!goal.milestones.length && (
          <p className={s.quiet}>
            No milestones yet. Add one to break this goal into steps.
          </p>
        )}
        {goal.milestones.map((milestone) => (
          <form
            key={milestone._id}
            className={s.milestoneEditor}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void action.run(() =>
                updateMilestone({
                  id: milestone._id,
                  patch: {
                    title: String(data.get("title")),
                    targetDate: String(data.get("date")) || null,
                  },
                }),
              );
            }}
          >
            <fieldset disabled={action.busy} className={s.form}>
              <label>
                Milestone title
                <input
                  name="title"
                  defaultValue={milestone.title}
                  required
                  maxLength={180}
                />
              </label>
              <label>
                Milestone date
                <input
                  name="date"
                  type="date"
                  defaultValue={milestone.targetDate ?? ""}
                />
              </label>
              <div className={s.opts}>
                <button
                  type="button"
                  className={s.f}
                  role="checkbox"
                  aria-checked={milestone.doneAt !== null}
                  aria-label={`Complete milestone: ${milestone.title}`}
                  onClick={() =>
                    void action.run(() =>
                      updateMilestone({
                        id: milestone._id,
                        patch: {
                          doneAt: milestone.doneAt === null ? Date.now() : null,
                        },
                      }),
                    )
                  }
                >
                  {milestone.doneAt === null ? "Mark done" : "Mark not done"}
                </button>
                <button className={s.f}>Save milestone</button>
                <button
                  type="button"
                  className={s.f}
                  onClick={() =>
                    void action.run(() =>
                      removeMilestone({ id: milestone._id }),
                    )
                  }
                >
                  Delete milestone
                </button>
              </div>
            </fieldset>
          </form>
        ))}
        <form
          className={s.form}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget,
              data = new FormData(form);
            if (
              await action.run(() =>
                createMilestone({
                  goalId: goal._id,
                  title: String(data.get("title")),
                  targetDate: String(data.get("date")) || null,
                  sortOrder: goal.milestones.length,
                }),
              )
            )
              form.reset();
          }}
        >
          <fieldset disabled={action.busy}>
            <label>
              New milestone
              <input name="title" required maxLength={180} />
            </label>
            <label>
              New milestone date
              <input name="date" type="date" />
            </label>
            <button className={s.f}>Add milestone</button>
          </fieldset>
        </form>
      </section>
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
      <footer className={s.pf}>
        <button
          className={`${s.btn} ${s.danger}`}
          disabled={action.busy}
          onClick={() => void action.run(() => remove(goal))}
        >
          Delete goal
        </button>
        <button className={`${s.btn} ${s.ghosty}`} onClick={close}>
          Done
        </button>
      </footer>
    </Dialog>
  );
}
