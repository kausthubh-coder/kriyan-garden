"use client";
import { useEffect, useRef, useState } from "react";
import s from "./Public.module.css";
export function SetupTabs({ snippets }: { snippets: { name: string; text: string }[] }) {
  const [active, setActive] = useState(0), [message, setMessage] = useState("");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const snippet = snippets[active];
  if (!snippet) return null;
  return <div className={s.snippet}><div className={s.tabs} role="tablist" aria-label="AI client">{snippets.map((item, i) => <button key={item.name} id={`setup-${i}`} ref={(el) => { tabs.current[i] = el; }} role="tab" aria-selected={active === i} aria-controls="setup-panel" tabIndex={active === i ? 0 : -1} onClick={() => { setActive(i); setMessage(""); }} onKeyDown={(e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? snippets.length - 1 : (active + (e.key === "ArrowRight" ? 1 : -1) + snippets.length) % snippets.length;
    setActive(next); setMessage(""); tabs.current[next]?.focus();
  }}>{item.name}</button>)}</div><div id="setup-panel" role="tabpanel" aria-labelledby={`setup-${active}`} tabIndex={0} className={s.codePanel}><pre className={s.code}><code>{snippet.text}</code></pre><button className={s.copy} onClick={async () => { try { await navigator.clipboard.writeText(snippet.text); setMessage("Copied setup"); clearTimeout(timer.current); timer.current = setTimeout(() => setMessage(""), 2000); } catch { setMessage("Copy failed. Select the setup text and copy it manually."); } }}>{message === "Copied setup" ? "Copied setup" : "Copy setup"}</button><p role="status" className={s.sr}>{message}</p></div></div>;
}
