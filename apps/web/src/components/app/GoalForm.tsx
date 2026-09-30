"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { useFormAction } from "./useFormAction";
import type { Area } from "./types";
import s from "./App.module.css";
export function GoalForm({
  areas,
  today,
  saved,
}: {
  areas: Area[];
  today: string;
  saved: () => void;
}) {
  const create = useMutation(api.goals.create),
    action = useFormAction();
  const [kind, setKind] = useState<"tasks" | "number" | "milestones">("tasks");
  return (
    <form
      className={s.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (
          await action.run(() =>
            create({
              areaId: String(data.get("area")) as Id<"areas">,
              title: String(data.get("title")),
              startDate: String(data.get("start")),
              targetDate: String(data.get("targetDate")) || null,
              metric:
                kind === "number"
                  ? {
                      kind,
                      target: Number(data.get("target")),
                      current: Number(data.get("current")),
                      unit: String(data.get("unit")),
                    }
                  : { kind },
            }),
          )
        )
          saved();
      }}
    >
      <label>
        Goal title
        <input name="title" required maxLength={120} />
      </label>
      <label>
        Area
        <select name="area" required>
          {areas.map((a) => (
            <option value={a._id} key={a._id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Start date
        <input name="start" type="date" required defaultValue={today} />
      </label>
      <label>
        Target date
        <input name="targetDate" type="date" required min={today} />
      </label>
      <label>
        Measure progress
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="tasks">Linked tasks</option>
          <option value="number">Number</option>
          <option value="milestones">Milestones</option>
        </select>
      </label>
      {kind === "number" && (
        <>
          <label>
            Target value
            <input
              name="target"
              type="number"
              min="0.01"
              step="any"
              required
              defaultValue={100}
            />
          </label>
          <label>
            Current value
            <input
              name="current"
              type="number"
              step="any"
              required
              defaultValue={0}
            />
          </label>
          <label>
            Unit
            <input name="unit" required maxLength={48} placeholder="km" />
          </label>
        </>
      )}
      {action.error && <p role="alert">{action.error}</p>}
      <button className={s.btn} disabled={action.busy || !areas.length}>
        Add goal
      </button>
    </form>
  );
}
