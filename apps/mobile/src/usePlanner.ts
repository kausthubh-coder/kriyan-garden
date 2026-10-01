import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { localClock, weekStart } from "@kriyan/core";
export function usePlanner(selectedDate: string | null) {
  const client = useConvex(),
    { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.profiles.ensure);
  const saveGuidance = useMutation(api.profiles.saveOnboarding);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void ensure({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Your profile could not load. Check your connection and retry loading.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [ensure, isAuthenticated, attempt]);
  const skip = !ready || !isAuthenticated;
  const profile = useQuery(api.profiles.get, skip ? "skip" : {});
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const clock = localClock(tick, profile?.timezone),
    date = selectedDate ?? clock.today;
  const areas = useQuery(api.areas.list, skip ? "skip" : {}),
    projects = useQuery(api.projects.list, skip ? "skip" : {}),
    goals = useQuery(api.goals.list, skip ? "skip" : {}),
    events = useQuery(api.events.list, skip ? "skip" : {}),
    tasks = useQuery(api.tasks.list, skip ? "skip" : {}),
    day = useQuery(api.day.get, skip ? "skip" : { date }),
    week = useQuery(
      api.week.get,
      skip ? "skip" : { startDate: weekStart(date) },
    );
  const hasTasks = !!tasks?.length;
  const firstTaskAdded = profile?.onboardingDraft?.["planner.firstTaskAdded"] === "1";
  useEffect(() => {
    if (!hasTasks || firstTaskAdded) return;
    void saveGuidance({ drafts: { "planner.firstTaskAdded": "1" } }).catch(() => setError("Your planner hint could not be saved. Check your connection and retry loading."));
  }, [hasTasks, firstTaskAdded, saveGuidance]);
  const subscribe = useCallback(
    (changed: () => void) => client.subscribeToConnectionState(() => changed()),
    [client],
  );
  const snapshot = useCallback(
    () => client.connectionState().isWebSocketConnected,
    [client],
  );
  const connected = useSyncExternalStore(subscribe, snapshot, () => true);
  return {
    profile,
    areas,
    projects,
    goals,
    events,
    tasks,
    day,
    week,
    clock,
    date,
    connected,
    error,
    loading:
      !profile ||
      !areas ||
      !projects ||
      !goals ||
      !events ||
      !tasks ||
      !day ||
      !week,
    retry: () => setAttempt((v) => v + 1),
  };
}
