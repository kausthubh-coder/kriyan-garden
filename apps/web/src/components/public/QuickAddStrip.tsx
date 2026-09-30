"use client";
import { useRef, useState } from "react";
import s from "./Public.module.css";

export function QuickAddStrip() {
  const [text, setText] = useState("");
  const [core, setCore] = useState<typeof import("@kriyan/core") | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<Promise<typeof import("@kriyan/core")> | null>(null);
  async function change(value: string) {
    setText(value);
    setError("");
    if (!value.trim() || core) return;
    try {
      pending.current ??= import("@kriyan/core");
      setCore(await pending.current);
    } catch {
      pending.current = null;
      setError("Quick add could not load. Type again to retry.");
    }
  }
  const today = core?.localClock(new Date()).today;
  const result = core && today && text.trim() ? core.parse(text, {
    today, defaultDate:today, defaultAreaId:"life",
    areas:[{id:"school",name:"School"},{id:"biz",name:"Business"},{id:"life",name:"Life"}],
    projects:[{id:"econ",name:"Econ 101",areaId:"school"}],
  }) : null;
  const area = result?.areaId === "school" ? "School" : result?.areaId === "biz" ? "Business" : "Life";
  return <>
    <h2><label htmlFor="quick-preview">Type it the way you would say it.</label></h2>
    <p>One line is enough. Kriyan reads the day, the time, the length and the tag, and asks for nothing else.</p>
    <div className={s.quick}>
      <input id="quick-preview" value={text} onChange={event => void change(event.target.value)} placeholder="essay fri 5pm #econ 2h" autoComplete="off" />
      <div className={s.chips} role="status" aria-live="polite">{result && core && <>
        <span className={s.chip}><i className={s.areaDot} style={{background:result.areaId === "school" ? "var(--school)" : result.areaId === "biz" ? "var(--biz)" : "var(--life)"}} />{area}{result.projectId && <small>Econ 101</small>}</span>
        {result.date && <span className={s.chip}>{core.shortDate(result.date)}</span>}
        {result.time && <span className={s.chip}>{result.time}</span>}
        {result.durationMinutes !== null && <span className={s.chip}>{core.formatMinutes(result.durationMinutes)}</span>}
      </>}</div>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className={s.examples}>Try {['gym tomorrow 7am','essay fri 5pm #econ 2h','call amma'].map(example => <button key={example} onClick={() => void change(example)}>{example}</button>)}</div>
  </>;
}
