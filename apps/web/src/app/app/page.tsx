"use client";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export default function AppPage() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.profiles.ensure);
  const add = useMutation(api.tasks.quickAdd);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const areas = useQuery(api.areas.list, ready ? {} : "skip");
  const day = useQuery(api.day.get, ready && today ? { date: today } : "skip");
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    ensure({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }).then(() => {
      if (!cancelled) { setToday(localToday()); setReady(true); setError(""); }
    }).catch(() => { if (!cancelled) setError("Your profile could not be loaded. Try loading it again."); });
    return () => { cancelled = true; };
  }, [ensure, isAuthenticated, attempt]);
  useEffect(() => {
    const timer = setInterval(() => setToday(localToday()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return <main className="placeholder">
    <h1>Kriyan</h1>
    {error && <p role="alert">{error}</p>}
    {!ready ? <><p role="status">Loading your planner.</p>{error && <button onClick={() => setAttempt((value) => value + 1)}>Load profile</button>}</> : <>
      <h2>Areas</h2>
      {areas === undefined ? <p>Loading areas.</p> : areas.length === 0 ? <p>No areas yet.</p> : <ul>{areas.map((area) => <li key={area._id}>{area.name}</li>)}</ul>}
      <form onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try { await add({ text: input, today: localToday() }); setInput(""); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Task could not be added. Try again."); }
        finally { setBusy(false); }
      }}>
        <label htmlFor="task">Task</label>
        <input id="task" value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} placeholder="Essay today 5pm 45m" />
        <button disabled={busy || !input.trim()}>{busy ? "Adding task" : "Add task"}</button>
      </form>
      <h2>Today</h2>
      {day === undefined ? <p>Loading tasks.</p> : day.timed.length + day.anytime.length === 0 ? <p>No tasks scheduled today.</p> : <ul>{[...day.timed, ...day.anytime].map((task) => <li key={task._id}>{task.title}</li>)}</ul>}
    </>}
  </main>;
}
