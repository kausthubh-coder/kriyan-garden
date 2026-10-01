"use client";
import { useId, useState } from "react";
import { goalTargetDates, shortDate } from "@kriyan/core";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import { useGoalTransport } from "./dataAccess";
import { useFormAction } from "./useFormAction";
import { DateEditor } from "./DateEditor";
import { Icon } from "./Icon";
import { areaColor, type Area, type Variables } from "./types";
import s from "./App.module.css";

export type GoalDraft = { title?: string; areaId?: Area["_id"]; metric?: Doc<"goals">["metric"] };
export function GoalForm({ areas, today, draft, saved, close }: {
  areas: Area[]; today: string; draft?: GoalDraft;
  saved: (goal: Doc<"goals">) => void; close: () => void;
}) {
  const { create } = useGoalTransport(), action = useFormAction(), errorId = useId();
  const [title, setTitle] = useState(draft?.title ?? "");
  const [areaId, setArea] = useState(draft?.areaId ?? areas[0]?._id);
  const [kind, setKind] = useState<Doc<"goals">["metric"]["kind"]>(draft?.metric?.kind ?? "tasks");
  const [target, setTarget] = useState(draft?.metric?.kind === "number" ? String(draft.metric.target) : "");
  const [unit, setUnit] = useState(draft?.metric?.kind === "number" ? draft.metric.unit : "");
  const dates = goalTargetDates(today);
  const [targetDate, setDate] = useState<string | null>(dates[1]);
  const [picking, setPicking] = useState(false), [error, setError] = useState("");
  const message = error || action.error;
  const summary = targetDate
    ? `Due ${shortDate(targetDate)}.${kind === "milestones" ? " You can add milestones next." : ""}`
    : "No target date. Pace is not shown.";
  return <form noValidate className={s.goalCreate} onSubmit={async (event) => {
    event.preventDefault();
    setError("");
    if (!title.trim()) { setError("Give the goal a name."); return; }
    if (!areaId) { setError("Choose an area for the goal."); return; }
    if (kind === "number" && (!target.trim() || !Number.isFinite(Number(target)) || Number(target) <= 0)) {
      setError("Enter a target number greater than zero."); return;
    }
    if (kind === "number" && !unit.trim()) { setError("Give the number a unit, such as books or km."); return; }
    let created: Doc<"goals"> | undefined;
    if (await action.run(async () => {
      created = await create({ title: title.trim(), areaId, startDate: today, targetDate,
        metric: kind === "number" ? { kind, current: 0, target: Number(target), unit: unit.trim() } : { kind } });
    }) && created) saved(created);
  }}>
    <div className={s.goalTitleLine}>
      <input name="title" aria-label="Goal title" placeholder="Name the goal" maxLength={120}
        aria-required="true" aria-invalid={!!message} aria-describedby={message ? errorId : undefined}
        value={title} onChange={(event) => { setTitle(event.target.value); setError(""); action.clearFeedback(); }} disabled={action.busy} />
      <button type="button" className={s.iconButton} aria-label="Close add goal" onClick={close}><Icon name="close" /></button>
    </div>
    {message && <p id={errorId} className={s.goalError} role="alert">{message}</p>}
    <fieldset disabled={action.busy} className={s.goalProperties}>
      <div className={s.goalProperty}><span className={s.propertyKey}>Area</span>
        <div className={s.chips} role="group" aria-label="Area">
          {areas.map((area) => <button type="button" key={area._id} className={`${s.f} ${areaId === area._id ? s.on : ""}`}
            style={{ "--c": areaColor(area) } as Variables} aria-pressed={areaId === area._id} onClick={() => setArea(area._id)}>
            <i className={s.dot} />{area.name}</button>)}
        </div>
      </div>
      <div className={s.goalProperty}><span className={s.propertyKey}>Target</span>
        <div className={s.chips} role="group" aria-label="Goal target">
          {["End of the month", "In 3 months", "End of the year"].map((label, index) => <button type="button" key={label}
            className={`${s.f} ${!picking && targetDate === dates[index] ? s.on : ""}`} aria-pressed={!picking && targetDate === dates[index]}
            onClick={() => { setDate(dates[index]); setPicking(false); }}>{label}</button>)}
          <button type="button" className={`${s.f} ${picking ? s.on : ""}`} aria-expanded={picking}
            onClick={() => setPicking(!picking)}>Pick a day</button>
          <button type="button" className={`${s.f} ${!picking && !targetDate ? s.on : ""}`} aria-pressed={!picking && !targetDate}
            onClick={() => { setDate(null); setPicking(false); }}>No date</button>
          {picking && <div className={s.goalDayEditor}><DateEditor pickerOnly value={targetDate} today={today} label="Target date" change={setDate} /></div>}
        </div>
      </div>
      <div className={s.goalProperty}><span className={s.propertyKey}>Measure</span>
        <div className={s.chips} role="group" aria-label="Measure">
          {([ ["tasks", "Tasks done"], ["number", "A number"], ["milestones", "Milestones"] ] as const).map(([value, label]) =>
            <button type="button" key={value} className={`${s.f} ${kind === value ? s.on : ""}`} aria-pressed={kind === value}
              onClick={() => setKind(value)}>{label}</button>)}
          {kind === "number" && <div className={s.goalNumberFields}>
            <label>Target<input aria-label="Target value" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
            <label>Unit<input aria-label="Unit" value={unit} maxLength={48} onChange={(event) => setUnit(event.target.value)} /></label>
          </div>}
        </div>
      </div>
    </fieldset>
    <footer className={s.goalCreateFoot}><span>{summary}</span><button className={s.btn} disabled={action.busy || !areas.length}>{action.busy ? "Adding goal" : "Add goal"}</button></footer>
  </form>;
}
