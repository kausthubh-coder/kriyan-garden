"use client";

import { useEffect, useState } from "react";

export function localIsoDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The viewer's local calendar day, kept fresh while the tab stays open.
export function useToday() {
  const [today, setToday] = useState(() => localIsoDay());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localIsoDay()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}
