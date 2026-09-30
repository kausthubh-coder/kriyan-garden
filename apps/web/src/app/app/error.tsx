"use client";
export default function AppError({ reset }: { reset: () => void }) {
  return <main className="placeholder"><p role="alert">Your planner could not be loaded. Try loading it again.</p><button onClick={reset}>Load planner</button></main>;
}
