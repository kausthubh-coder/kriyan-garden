"use client";
import s from "@/components/app/App.module.css";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className={`${s.app} ${s.page}`} style={{ display: "block" }}>
      <header className={s.dh}>
        <h1>Your planner could not be loaded</h1>
      </header>
      <div className={s.empty} role="alert">
        The planner connection failed. Try loading it
        again. <button onClick={reset}>Load planner</button>
        <a href="/app">View day</a>
      </div>
    </main>
  );
}
