"use client";
import { useState } from "react";
import { formatMinutes, parse } from "@kriyan/core";
import { useClock } from "../app/usePlanner";
import s from "./Public.module.css";
export function QuickAddStrip() {
  const [text, setText] = useState(""), clock = useClock();
  const result = clock ? parse(text, { today: clock.today, defaultDate: clock.today, defaultAreaId: "life", areas: [{ id: "school", name: "School" }, { id: "biz", name: "Business" }, { id: "life", name: "Life" }], projects: [{ id: "econ", name: "Econ 101", areaId: "school" }] }) : null;
  return <div className={s.quick}><h2><label htmlFor="quick-preview">Type it the way you would say it.</label></h2><input id="quick-preview" value={text} onChange={(e) => setText(e.target.value)} placeholder="gym tomorrow 7am" autoComplete="off" />
    <div className={s.chips} role="status" aria-live="polite">{result && text.trim() ? <><span className={s.chip}>{result.title || "Enter a task title"}</span><span className={s.chip}>{result.projectId ? "School / Econ 101" : result.areaId === "biz" ? "Business" : result.areaId === "school" ? "School" : "Life"}</span><span className={s.chip}>{result.date ?? "No date yet"}</span><span className={s.chip}>{result.time ?? "Any time"}</span><span className={s.chip}>{result.durationMinutes === null ? "No length" : formatMinutes(result.durationMinutes)}</span></> : <span className={s.caption}>A day, a time, a length or a #tag. All optional.</span>}</div>
    <div className={s.examples}>{["gym tomorrow 7am", "essay fri #econ 2h", "call amma"].map((example) => <button key={example} onClick={() => setText(example)}>{example}</button>)}</div>
  </div>;
}
