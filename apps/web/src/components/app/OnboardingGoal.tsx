"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { shortDate, goalTargetDates } from "@kriyan/core";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { AreaChips } from "./AreaChips";
import { SaveFeedback, useInlineSave, useSetupDraft } from "./useInlineSave";
import type { Area, Goal, Profile } from "./types";
import s from "./Onboarding.module.css";

export { goalTargetDates } from "@kriyan/core";
export function OnboardingGoal({
  areas,
  goal,
  profile,
  today,
  preview,
  advance,
}: {
  areas: Area[];
  goal?: Goal;
  profile: Profile;
  today: string;
  preview: (goal: Goal) => void;
  advance: () => void;
}) {
  const create = useMutation(api.goals.create),
    update = useMutation(api.goals.update),
    action = useInlineSave();
  const goalId = useRef(goal?._id);
  const [picking, setPicking] = useState(false);
  const dates = goalTargetDates(today);
  const draft = useSetupDraft(
    "goal",
    {
      title: goal?.title ?? "",
      area: goal?.areaId ?? areas[0]?._id ?? "",
      date: goal?.targetDate ?? dates[0],
      kind: goal?.metric.kind ?? "tasks",
      target:
        goal?.metric.kind === "number" ? String(goal.metric.target) : "10",
      unit: goal?.metric.kind === "number" ? goal.metric.unit : "",
    },
    profile,
  );
  const asGoal = useCallback((v: Record<string, string>): Goal => {
    const metric: Goal["metric"] =
      v.kind === "number"
        ? {
            kind: "number",
            current: goal?.metric.kind === "number" ? goal.metric.current : 0,
            target: Number(v.target),
            unit: v.unit,
          }
        : v.kind === "milestones"
          ? { kind: "milestones" }
          : { kind: "tasks" };
    return {
      _id: goalId.current ?? ("preview-goal" as Id<"goals">),
      _creationTime: goal?._creationTime ?? Date.now(),
      ownerId: profile.ownerId,
      createdAt: goal?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      title: v.title || "Your first goal",
      areaId: v.area as Id<"areas">,
      note: goal?.note ?? "",
      targetDate: v.date || null,
      startDate: goal?.startDate ?? today,
      metric,
      status: "active",
      sortOrder: goal?.sortOrder ?? 0,
      linkedTasks: goal?.linkedTasks ?? { total: 0, done: 0 },
      milestones: goal?.milestones ?? [],
    };
  }, [goal, profile.ownerId, today]);
  const initialDraft = useRef(draft.values);
  const previewInitialized = useRef(false);
  useEffect(() => {
    if (previewInitialized.current) return;
    previewInitialized.current = true;
    if (initialDraft.current.title.trim()) preview(asGoal(initialDraft.current));
  }, [asGoal, preview]);
  function change(patch: Record<string, string>) {
    const next = { ...draft.values, ...patch };
    draft.change(patch);
    preview(asGoal(next));
  }
  function save(patch: Record<string, string> = {}) {
    const values = { ...draft.values, ...patch };
    if (!values.title.trim() || !values.area) return;
    // A number is a draft until both of its fields are valid. Saving the
    // empty unit when the chip is chosen rejects the mutation and blocks Continue.
    if (values.kind === "number" &&
      (!values.unit.trim() || !Number.isFinite(Number(values.target)) || Number(values.target) <= 0)) return;
    const row = asGoal(values);
    void action.run("goal", async () => {
      const fields = {
        title: row.title,
        areaId: row.areaId,
        startDate: row.startDate,
        targetDate: row.targetDate,
        metric: row.metric,
      };
      const result = goalId.current
        ? await update({ id: goalId.current, patch: fields })
        : await create(fields);
      goalId.current = result._id;
    });
  }
  function edit(patch: Record<string, string>) {
    change(patch);
    save(patch);
  }
  return (
    <div className={s.answers}>
      <input
        className={s.input}
        aria-label="Goal title"
        placeholder="What would you like to achieve?"
        value={draft.values.title}
        maxLength={120}
        onChange={(e) => change({ title: e.target.value })}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!draft.values.title.trim()) advance();
            else e.currentTarget.blur();
          }
        }}
      />
      <span className={s.label}>Area</span>
      <AreaChips
        areas={areas}
        value={draft.values.area}
        change={(area) => edit({ area })}
      />
      <span className={s.label}>Target</span>
      <div className={s.chips}>
        {["End of the month", "In 3 months"].map((label, index) => (
          <button
            type="button"
            key={label}
            className={`${s.chip} ${draft.values.date === dates[index] ? s.chipOn : ""}`}
            aria-pressed={draft.values.date === dates[index]}
            onClick={() => edit({ date: dates[index] })}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={s.chip}
          aria-expanded={picking}
          onClick={() => setPicking(!picking)}
        >
          Pick a day
        </button>
      </div>
      <p className={s.feedback}>
        {draft.values.date ? shortDate(draft.values.date) : "No target date"}
      </p>
      {picking && (
        <input
          className={s.input}
          type="date"
          aria-label="Goal target date"
          value={draft.values.date}
          min={today}
          onChange={(e) => edit({ date: e.target.value })}
        />
      )}
      <span className={s.label}>Measure</span>
      <div className={s.chips}>
        {(["tasks", "number", "milestones"] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            className={`${s.chip} ${draft.values.kind === kind ? s.chipOn : ""}`}
            aria-pressed={draft.values.kind === kind}
            onClick={() => edit({ kind })}
          >
            {kind === "tasks"
              ? "Tasks done"
              : kind === "number"
                ? "A number"
                : "Milestones"}
          </button>
        ))}
      </div>
      {draft.values.kind === "number" && (
        <div className={s.formRow}>
          <label className={s.field}>
            <span className={s.label}>Target number</span>
            <input
              className={s.input}
              type="number"
              min={1}
              aria-label="Target number"
              value={draft.values.target}
              onChange={(e) => change({ target: e.target.value })}
              onBlur={() => save()}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>Unit</span>
            <input
              className={s.input}
              aria-label="Unit"
              placeholder="books, km, hours"
              value={draft.values.unit}
              onChange={(e) => change({ unit: e.target.value })}
              onBlur={() => save()}
            />
          </label>
        </div>
      )}
      <SaveFeedback state={action.feedback.goal} />
      <SaveFeedback state={draft.feedback} />
    </div>
  );
}
