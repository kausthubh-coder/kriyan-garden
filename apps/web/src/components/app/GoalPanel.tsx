"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dayValue, addedDate, shortDate } from "@kriyan/core";
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
  focusMilestones = false,
}: {
  goal: Goal;
  areas: Area[];
  today: string;
  close: () => void;
  remove: (goal: Goal) => Promise<void>;
  focusMilestones?: boolean;
}) {
  const { update, createMilestone, updateMilestone, removeMilestone } =
    useGoalTransport();
  const action = useFormAction();
  const [open, setOpen] = useState<string | null>(null);
  const [milestoneDate, setMilestoneDate] = useState<string | null>(null);
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
            <form noValidate
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
      escape={() => (milestoneDate ? setMilestoneDate(null) : open ? setOpen(null) : close())}
      initialFocus={focusMilestones ? 'input[aria-label="Add a milestone"]' : 'button[aria-label="Close goal details"]'}
      focusOnTouch={focusMilestones}
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
        <AutoTextarea className={`${s.panelNotes} ${s.goalNotes}`} aria-label="Note" defaultValue={goal.note} maxLength={180} placeholder="Add notes"
          onBlur={(event) => { if (event.target.value !== goal.note) void save({note: event.target.value}); }} />
        <fieldset>
          <PropertyList rows={rows} open={open} setOpen={setOpen} />
        </fieldset>
        <section className={s.milestonesEditor} aria-label="Milestones editor">
          <h2>Milestones <span>{goal.milestones.filter((item) => item.doneAt !== null).length} of {goal.milestones.length} done</span></h2>
          {!goal.milestones.length && <p className={s.quiet}>No milestones yet.</p>}
          {goal.milestones.map((milestone) => (
            <div key={milestone._id} className={s.milestoneItem}>
              <div className={s.milestoneRow}>
                <button type="button" className={`${s.chk} ${milestone.doneAt !== null ? s.is : ""}`} role="checkbox" aria-checked={milestone.doneAt !== null} aria-label={`Complete milestone: ${milestone.title}`} disabled={action.busy}
                  onClick={() => void run(() => updateMilestone({id: milestone._id, patch: {doneAt: milestone.doneAt === null ? Date.now() : null}}))} />
                <input aria-label="Milestone title" className={s.milestoneTitle} defaultValue={milestone.title} required maxLength={180}
                  onBlur={(event) => { const title = event.target.value.trim(); if (title && title !== milestone.title) void run(() => updateMilestone({id: milestone._id, patch: {title}})); if (!title) event.target.value = milestone.title; }}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) {event.preventDefault(); event.currentTarget.blur();} }} />
                <button type="button" className={s.milestoneDate} aria-label={`Set date: ${milestone.title}`} aria-expanded={milestoneDate === milestone._id}
                  onClick={() => setMilestoneDate(milestoneDate === milestone._id ? null : milestone._id)}>{milestone.targetDate ? shortDate(milestone.targetDate) : "Add date"}</button>
                <button type="button" className={`${s.iconButton} ${s.milestoneRemove}`} aria-label={`Remove milestone: ${milestone.title}`} disabled={action.busy}
                  onClick={() => void run(() => removeMilestone({id: milestone._id}))}><Icon name="close" /></button>
              </div>
              {milestoneDate === milestone._id && <div className={s.propertyEditor} role="group" aria-label={`Date editor: ${milestone.title}`}>
                <DateEditor value={milestone.targetDate} today={today} label="Milestone date" change={(targetDate) => void run(() => updateMilestone({id: milestone._id, patch: {targetDate}}))} />
              </div>}
            </div>
          ))}
          <form noValidate onSubmit={async (event) => {
            event.preventDefault(); const form = event.currentTarget; const title = String(new FormData(form).get("title")).trim(); if (!title) return;
            if (await run(() => createMilestone({goalId: goal._id, title, targetDate: null, sortOrder: goal.milestones.length}))) form.reset();
          }}>
            <input className={s.milestoneAdd} name="title" aria-label="Add a milestone" placeholder="Add a milestone" maxLength={180}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          </form>
        </section>
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
