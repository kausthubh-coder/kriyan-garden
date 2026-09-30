"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { weekStart } from "@kriyan/core";
import { localToday } from "./types";

export function useClock() {
  const [clock, setClock] = useState<{ today: string; minutes: number } | null>(
    null,
  );
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({
        today: localToday(),
        minutes: now.getHours() * 60 + now.getMinutes(),
      });
    };
    const first = setTimeout(tick, 0),
      timer = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return clock;
}
export function usePlanner(date: string | null) {
  const client = useConvex(),
    { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.profiles.ensure);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    ensure({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setError("");
        }
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Your profile could not be loaded. Try loading it again.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ensure, attempt]);
  const skip = !ready || !isAuthenticated;
  const profile = useQuery(api.profiles.get, skip ? "skip" : {});
  const areas = useQuery(api.areas.list, skip ? "skip" : {});
  const projects = useQuery(api.projects.list, skip ? "skip" : {});
  const goals = useQuery(api.goals.list, skip ? "skip" : {});
  const activeTasks = useQuery(
    api.tasks.list,
    skip ? "skip" : { status: "active" },
  );
  const completedTasks = useQuery(
    api.tasks.list,
    skip ? "skip" : { status: "completed" },
  );
  const tasks =
    activeTasks && completedTasks
      ? [...activeTasks, ...completedTasks]
      : undefined;
  const day = useQuery(api.day.get, skip || !date ? "skip" : { date });
  const week = useQuery(
    api.week.get,
    skip || !date ? "skip" : { startDate: weekStart(date) },
  );
  const subscribe = useCallback(
    (changed: () => void) => client.subscribeToConnectionState(() => changed()),
    [client],
  );
  const snapshot = useCallback(
    () => client.connectionState().isWebSocketConnected,
    [client],
  );
  const connected = useSyncExternalStore(subscribe, snapshot, () => true);
  const subscribeOnline = useCallback((changed: () => void) => {
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const loading =
    !profile || !areas || !projects || !goals || !tasks || !day || !week;
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(loading), loading ? 150 : 0);
    return () => clearTimeout(timer);
  }, [loading]);
  return {
    client,
    profile,
    areas,
    projects,
    goals,
    tasks,
    day,
    week,
    connected: connected && online,
    loading,
    showSkeleton: loading && showSkeleton,
    error,
    retry: () => setAttempt((attempt) => attempt + 1),
  };
}
