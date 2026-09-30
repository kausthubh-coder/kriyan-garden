// @vitest-environment happy-dom
import { useSyncExternalStore } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";
import { getFunctionName } from "convex/server";
import { api } from "@kriyan/backend/convex/_generated/api";
import { AppShell } from "./AppShell";
import { PlannerDataContext, useSelectedTask, type PlannerDataAccess } from "./dataAccess";
import { selectGoal } from "./goalSelection";
import { cacheTask, findTask, optimisticPatch } from "./optimistic";
import { selectTask, taskSelectionArgs } from "./taskSelection";
import type { Goal, Task } from "./types";
import { createDemoStore } from "../demo/store";

const navigation = vi.hoisted(() => ({
  push: vi.fn((url: string) => {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/demo",
  useSearchParams: () => new URLSearchParams(useSyncExternalStore(
    (listener) => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); },
    () => window.location.search,
  )),
}));
vi.mock("convex/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("convex/react")>(),
  useConvexAuth: vi.fn(), useQuery: vi.fn(), useConvex: vi.fn(), useMutation: vi.fn(),
}));
// Keep the real shell, selection, dialog, task editor and action hooks. The
// planner views supply only navigation controls needed by these regressions.
vi.mock("./DayView", () => ({ DayView: ({ tasks, open, goGoals }: { tasks: Task[]; open: (task: Task) => void; goGoals: () => void }) => {
  const task = tasks[0];
  return <main>Planner available<button disabled={!task} onClick={() => { if (task) open(task); }}>Open listed task</button><button onClick={goGoals}>Show goals</button></main>;
} }));
vi.mock("./GoalsView", () => ({ GoalsView: ({ goals, openGoal }: { goals: Goal[]; openGoal: (goal: Goal) => void }) => {
  const goal = goals[0];
  return <main>Goals available<button onClick={() => { if (goal) openGoal(goal); }}>Open goal</button></main>;
} }));

beforeEach(() => {
  window.history.replaceState(null, "", "/demo");
  vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: true, isLoading: false, isRefreshing: false });
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, media: "", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.mocked(useQuery).mockReset(); });

function fixture(key: string | null, outsideList = false) {
  const today = "2026-09-30", store = createDemoStore(today);
  const task = store.snapshot().tasks[0];
  if (!task) throw new Error("Task fixture is missing.");
  let loading = false;
  const access: PlannerDataAccess = {
    usePlanner(date) {
      const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
      return {
        ...state, tasks: outsideList ? [] : state.tasks,
        goals: state.goals.map((goal) => ({ ...goal, linkedTasks: { total: 0, done: 0 } })),
        clock: { today, minutes: 600 }, habits: [], day: store.day(date ?? today), week: store.week(date ?? today),
        connected: true, loading: false, showSkeleton: false, error: "", retry: () => {},
      };
    },
    useTasks: () => store.tasks, useGoals: () => store.goals, useSelectedGoal: selectGoal,
    useSelectedTask(key) {
      const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
      return selectTask(key, loading ? undefined : state.tasks);
    },
  };
  window.history.replaceState(null, "", `/demo?date=${today}${key === null ? "" : `&task=${encodeURIComponent(key === "owned" ? task._id : key)}`}`);
  const element = () => <PlannerDataContext.Provider value={access}><AppShell demo /></PlannerDataContext.Provider>;
  return { task, store, element, setLoading: (value: boolean) => { loading = value; } };
}

test("selection requests preserve raw string keys and skip absent, optimistic or unauthenticated selections", () => {
  for (const key of [null, "", "optimistic-local"])
    expect(taskSelectionArgs(key)).toBe("skip");
  expect(taskSelectionArgs("arbitrary URL text", false)).toBe("skip");
  expect(taskSelectionArgs("arbitrary URL text")).toEqual({ key: "arbitrary URL text" });
  expect(selectTask(null, [])).toBeUndefined();
  expect(selectTask("optimistic-local", [])).toBeUndefined();
  expect(selectTask("missing", undefined)).toBeUndefined();
  expect(selectTask("missing", [])).toBeNull();
});

test("authenticated selection uses the safe lookup and preserves loading, null and row results", () => {
  const { task } = fixture(null);
  const query = vi.mocked(useQuery);
  query.mockReturnValue(undefined);
  const selected = renderHook(() => useSelectedTask("arbitrary URL text"));
  expect(selected.result.current).toBeUndefined();
  const call = query.mock.calls[0];
  if (!call) throw new Error("Selection did not subscribe.");
  expect(getFunctionName(call[0])).toBe("tasks:lookup");
  expect(call[1]).toEqual({ key: "arbitrary URL text" });
  query.mockReturnValue(null); selected.rerender();
  expect(selected.result.current).toBeNull();
  query.mockReturnValue(task); selected.rerender();
  expect(selected.result.current).toBe(task);
});

test("the live selection hook skips Convex lookup arguments before authentication and for local-only keys", () => {
  vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: false, isLoading: false, isRefreshing: false });
  const selected = renderHook(({ key }) => useSelectedTask(key), { initialProps: { key: "owned" as string | null } });
  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toBe("skip");
  vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: true, isLoading: false, isRefreshing: false });
  for (const key of [null, "", "optimistic-local"]) {
    selected.rerender({ key });
    expect(vi.mocked(useQuery).mock.lastCall?.[1]).toBe("skip");
  }
});

test("loading selections stay open until the owned task arrives", () => {
  const f = fixture("owned"); f.setLoading(true);
  const rendered = render(f.element());
  expect(screen.getByRole("status").textContent).toBe("Loading task details.");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(navigation.push).not.toHaveBeenCalled();
  f.setLoading(false); rendered.rerender(f.element());
  expect(screen.getByRole("textbox", { name: "Task title" })).toHaveProperty("value", f.task.title);
});

test("malformed or absent selections show recovery without taking down the planner and clear the URL on close", () => {
  const f = fixture("arbitrary missing key");
  render(f.element());
  expect(screen.getByText("Planner available")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("This task is unavailable");
  expect(screen.queryByRole("textbox", { name: "Task title" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close task details" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(new URLSearchParams(window.location.search).has("task")).toBe(false);
  expect(new URLSearchParams(window.location.search).get("date")).toBe("2026-09-30");
});

test("owned deep links outside the planner list retain the editor and unsaved drafts during ordinary updates", async () => {
  const f = fixture("owned", true);
  render(f.element());
  const title = screen.getByRole("textbox", { name: "Task title" });
  const notes = screen.getByRole("textbox", { name: "Notes" });
  fireEvent.change(title, { target: { value: "Unsaved title" } });
  fireEvent.change(notes, { target: { value: "Unsaved notes" } });
  await act(() => f.store.tasks.update({ id: f.task._id, patch: { deadline: "2026-10-01", durationMinutes: null } }));
  expect(screen.getByRole("textbox", { name: "Task title" })).toBe(title);
  expect(title).toHaveProperty("value", "Unsaved title");
  expect(notes).toHaveProperty("value", "Unsaved notes");
  expect(screen.getByLabelText("Deadline")).toHaveProperty("value", "2026-10-01");
  expect(screen.getByRole("button", { name: "None" }).getAttribute("aria-pressed")).toBe("true");
});

test("deletion from another client changes the open task to unavailable and Escape restores focus and selection cleanup", async () => {
  const f = fixture(null);
  render(f.element());
  const opener = screen.getByRole("button", { name: "Open listed task" }); opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole("textbox", { name: "Task title" })).toHaveProperty("value", f.task.title);
  await act(() => f.store.tasks.remove({ id: f.task._id }));
  expect(screen.getByRole("alert").textContent).toContain("This task is unavailable");
  expect(screen.getByText("Planner available")).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(new URLSearchParams(window.location.search).has("task")).toBe(false);
  expect(document.activeElement).toBe(opener);
});

test("task and goal navigation keeps selection exclusive and changing views closes their panels", () => {
  const f = fixture("owned"); render(f.element());
  fireEvent.click(screen.getByRole("button", { name: "Show goals" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open goal" }));
  expect(screen.getByRole("dialog", { name: "Goal details" })).toBeTruthy();
  expect(new URLSearchParams(window.location.search).has("task")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Day" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open listed task" }));
  expect(screen.getByRole("dialog", { name: "Task details" })).toBeTruthy();
  expect(new URLSearchParams(window.location.search).has("goal")).toBe(false);
});

test("skipped demo selections mount no panel and invoke no Convex hooks", () => {
  const f = fixture("optimistic-local"); render(f.element());
  expect(screen.queryByRole("dialog")).toBeNull();
  for (const hook of [useQuery, useMutation, useConvex, useConvexAuth]) expect(hook).not.toHaveBeenCalled();
});

test("a rejected edit retains the selected task draft and retry uses the original patch", async () => {
  const f = fixture("owned");
  const originalUpdate = f.store.tasks.update;
  const update = vi.spyOn(f.store.tasks, "update").mockRejectedValueOnce(new Error("Save failed. Try again.")).mockImplementation(originalUpdate);
  render(f.element());
  const title = screen.getByRole("textbox", { name: "Task title" });
  fireEvent.change(title, { target: { value: "Retry title" } }); fireEvent.blur(title);
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry save" })).toBeTruthy());
  expect(title).toHaveProperty("value", "Retry title");
  expect(screen.getByRole("dialog", { name: "Task details" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
  await waitFor(() => expect(f.store.snapshot().tasks.find((task) => task._id === f.task._id)?.title).toBe("Retry title"));
  expect(update).toHaveBeenCalledTimes(2);
  expect(update.mock.calls[1]).toEqual(update.mock.calls[0]);
});

test("optimistic updates can find and edit a task held only in the safe selection query", () => {
  const { task } = fixture(null);
  const queries = vi.fn<OptimisticLocalStore["getAllQueries"]>().mockReturnValue([]);
  const store: OptimisticLocalStore = { getQuery: vi.fn(), getAllQueries: queries, setQuery: vi.fn() };
  const entries = [{ args: { key: "normalized-url-alias" }, value: task }];
  queries.mockReturnValueOnce(entries);
  expect(findTask(store, task._id)).toBe(task);
  // Lookup, then list/day/week caches, then the selected-query cache.
  queries.mockReturnValueOnce(entries).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce(entries);
  optimisticPatch(store, { id: task._id, patch: { date: null, durationMinutes: null } });
  expect(store.setQuery).toHaveBeenCalledWith(api.tasks.lookup, entries[0]?.args, { ...task, date: null, time: null, durationMinutes: null });
});

test("optimistic removal makes a selected task unavailable without populating unrelated or loading selections", () => {
  const { task } = fixture(null);
  const queries = vi.fn<OptimisticLocalStore["getAllQueries"]>().mockReturnValue([]);
  const store: OptimisticLocalStore = { getQuery: vi.fn(), getAllQueries: queries, setQuery: vi.fn() };
  queries.mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([
    { args: { key: task._id }, value: task }, { args: { key: "missing" }, value: null }, { args: { key: "loading" }, value: undefined },
  ]);
  cacheTask(store, task._id, null);
  expect(store.setQuery).toHaveBeenCalledTimes(1);
  expect(store.setQuery).toHaveBeenCalledWith(api.tasks.lookup, { key: task._id }, null);
});
