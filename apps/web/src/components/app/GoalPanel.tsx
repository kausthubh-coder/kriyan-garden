"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dayValue, addedDate } from "@kriyan/core";
import { useGoalTransport } from "./dataAccess";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { useFormAction } from "./useFormAction";
import { PropertyList, type Property } from "./PropertyList";
import { DateEditor } from "./DateEditor";
import { AutoTextarea } from "./AutoTextarea";
import { areaColor, type Area, type Goal, type Variables } from "./types";
import s from "./App.module.css";

export function GoalPanel({
  goal,
  areas,
  today,
  close,
  remove,
}: {
  goal: Goal;
  areas: Area[];
  today: string;
  close: () => void;
  remove: (goal: Goal) => Promise<void>;
}) {
  const { update, createMilestone, updateMilestone, removeMilestone } =
    useGoalTransport();
  const action = useFormAction();
  const [open, setOpen] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState(false);
  const area = areas.find((area) => area._id === goal.areaId);
  const metric = goal.metric;
  type Patch = Parameters<typeof update>[0]["patch"];
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(goal);
  useEffect(() => {
    latest.current = goal;
  }, [goal]);
  const run = useCallback(
    (operation: () => Promise<unknown>) => {
      const result = pending.current.then(() => action.run(operation));
      pending.current = result;
      return result;
    },
    [action],
  );
  const save = useCallback(
    (patch: Patch) =>
      run(async () => {
        const updated = await update({ id: goal._id, patch });
        latest.current = { ...latest.current, ...updated };
      }),
    [goal._id, run, update],
  );
  const saveNumber = useCallback(
    (
      patch: Partial<
        Pick<
          Extract<Goal["metric"], { kind: "number" }>,
          "current" | "target" | "unit"
        >
      >,
    ) =>
      run(async () => {
        if (latest.current.metric.kind !== "number") return;
        const updated = await update({
          id: goal._id,
          patch: { metric: { ...latest.current.metric, ...patch } },
        });
        latest.current = { ...latest.current, ...updated };
      }),
    [goal._id, run, update],
  );
  const rows: Property[] = [
    {
      id: "area",
      label: "Area",
      value: (
        <>
          <i className={s.dot} />
          {area?.name}
        </>
      ),
      editor: areas.map((area) => (
        <button
          key={area._id}
          type="button"
          className={`${s.f} ${goal.areaId === area._id ? s.on : ""}`}
          aria-pressed={goal.areaId === area._id}
          style={{ "--c": areaColor(area) } as Variables}
          onClick={() => void save({ areaId: area._id })}
        >
          <i className={s.dot} />
          {area.name}
        </button>
      )),
    },
    {
      id: "targetDate",
      label: "Target date",
      value: dayValue(goal.targetDate, today),
      empty: !goal.targetDate,
      editor: (
        <DateEditor
          value={goal.targetDate}
          today={today}
          label="Target date"
          change={(value) => void save({ targetDate: value })}
        />
      ),
    },
    {
      id: "startDate",
      label: "Start date",
      value: dayValue(goal.startDate, today),
      editor: (
        <DateEditor
          value={goal.startDate}
          today={today}
          label="Start date"
          required
          change={(value) => {
            if (value) void save({ startDate: value });
          }}
        />
      ),
    },
    {
      id: "measure",
      label: "Measure",
      value:
        metric.kind === "tasks"
          ? "Tasks"
          : metric.kind === "number"
            ? "Number"
            : "Milestones",
      editor: (
        <>
          {(
            [
              ["tasks", "Tasks"],
              ["number", "Number"],
              ["milestones", "Milestones"],
            ] as const
          ).map(([kind, label]) => (
            <button
              type="button"
              key={kind}
              className={`${s.f} ${metric.kind === kind ? s.on : ""}`}
              aria-pressed={metric.kind === kind}
              onClick={() => {
                if (kind === "number") setNumberDraft(true);
                else {
                  setNumberDraft(false);
                  void save({ metric: { kind } });
                }
              }}
            >
              {label}
            </button>
          ))}
          {numberDraft && (
            <form
              className={s.form}
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                if (
                  await save({
                    metric: {
                      kind: "number",
                      current: Number(data.get("current")),
                      target: Number(data.get("target")),
                      unit: String(data.get("unit")),
                    },
                  })
                )
                  setNumberDraft(false);
              }}
            >
              <label>
                Current value
                <input
                  name="current"
                  type="number"
                  step="any"
                  min={0}
                  required
                  defaultValue={metric.kind === "number" ? metric.current : 0}
                />
              </label>
              <label>
                Target
                <input
                  name="target"
                  type="number"
                  step="any"
                  min={0.01}
                  required
                  defaultValue={metric.kind === "number" ? metric.target : ""}
                />
              </label>
              <label>
                Unit
                <input
                  name="unit"
                  required
                  maxLength={48}
                  defaultValue={metric.kind === "number" ? metric.unit : ""}
                />
              </label>
              <button className={s.f}>Set measure</button>
            </form>
          )}
        </>
      ),
    },
    ...(metric.kind === "number"
      ? [
          {
            id: "current",
            label: "Current value",
            value: String(metric.current),
            editor: (
              <input
                aria-label="Current value"
                type="number"
                min={0}
                step="any"
                required
                key={metric.current}
                defaultValue={metric.current}
                onBlur={(event) => {
                  if (event.target.validity.valid && event.target.value)
                    void saveNumber({ current: Number(event.target.value) });
                  else event.target.value = String(metric.current);
                }}
              />
            ),
          },
          {
            id: "unit",
            label: "Unit",
            value: metric.unit,
            editor: (
              <input
                aria-label="Unit"
                maxLength={48}
                required
                key={metric.unit}
                defaultValue={metric.unit}
                onBlur={(event) => {
                  if (event.target.value.trim())
                    void saveNumber({ unit: event.target.value.trim() });
                  else event.target.value = metric.unit;
                }}
              />
            ),
          },
          {
            id: "target",
            label: "Target",
            value: String(metric.target),
            editor: (
              <input
                aria-label="Target value"
                type="number"
                min={0.01}
                step="any"
                required
                key={metric.target}
                defaultValue={metric.target}
                onBlur={(event) => {
                  if (event.target.validity.valid && event.target.value)
                    void saveNumber({ target: Number(event.target.value) });
                  else event.target.value = String(metric.target);
                }}
              />
            ),
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      value:
        goal.status === "active"
          ? "Active"
          : goal.status === "done"
            ? "Done"
            : "Archived",
      editor: (
        <>
          <button
            type="button"
            className={`${s.f} ${goal.status === "active" ? s.on : ""}`}
            aria-pressed={goal.status === "active"}
            onClick={() => void save({ status: "active" })}
          >
            Active
          </button>
          <button
            type="button"
            className={`${s.f} ${goal.status === "done" ? s.on : ""}`}
            aria-pressed={goal.status === "done"}
            onClick={() => void save({ status: "done" })}
          >
            Done
          </button>
          <button
            type="button"
            className={`${s.f} ${goal.status === "archived" ? s.on : ""}`}
            aria-pressed={goal.status === "archived"}
            onClick={() => void save({ status: "archived" })}
          >
            Archived
          </button>
        </>
      ),
    },
  ];
  return (
    <Dialog
      label="Goal details"
      className={s.panel}
      close={close}
      escape={() => (open ? setOpen(null) : close())}
      initialFocus='textarea[aria-label="Goal title"]'
    >
      <div
        className={s.panelContent}
        style={{ "--c": areaColor(area) } as Variables}
      >
        <div className={s.ph}>
          <i className={s.dot} />
          {area?.name}
          <button
            className={s.iconButton}
            onClick={close}
            aria-label="Close goal details"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className={s.tt}>
          <AutoTextarea
            aria-label="Goal title"
            defaultValue={goal.title}
            maxLength={120}
            onBlur={(event) => {
              const title = event.target.value.trim();
              if (title && title !== goal.title) void save({ title });
              if (!title) event.target.value = goal.title;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <fieldset>
          <PropertyList rows={rows} open={open} setOpen={setOpen} />
        </fieldset>
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
                void run(() =>
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
                      void run(() =>
                        updateMilestone({
                          id: milestone._id,
                          patch: {
                            doneAt:
                              milestone.doneAt === null ? Date.now() : null,
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
                      void run(() => removeMilestone({ id: milestone._id }))
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
                await run(() =>
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
        <AutoTextarea
          className={s.panelNotes}
          aria-label="Note"
          defaultValue={goal.note}
          maxLength={180}
          placeholder="Add notes"
          onBlur={(event) => {
            if (event.target.value !== goal.note)
              void save({ note: event.target.value });
          }}
        />
        {action.error && <p role="alert">{action.error}</p>}
        {action.message && (
          <p role="status" className={s.sr}>
            {action.message}
          </p>
        )}
        <footer className={s.pf}>
          <span>Added {addedDate(goal.createdAt)}</span>
          <button
            className={`${s.btn} ${s.danger}`}
            disabled={action.busy}
            onClick={() => void run(() => remove(goal))}
          >
            Delete goal
          </button>
        </footer>
      </div>
    </Dialog>
  );
}
