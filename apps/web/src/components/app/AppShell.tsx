"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { addDays, type QuickAddResult } from "@kriyan/core";
import { usePlanner } from "./usePlanner";
import { useTaskActions } from "./useTaskActions";
import { Rail } from "./Rail";
import { DayView } from "./DayView";
import { ListView } from "./ListView";
import { WeekView } from "./WeekView";
import { GoalsView } from "./GoalsView";
import { Onboarding } from "./Onboarding";
import { Settings } from "./Settings";
import { QuickAdd } from "./QuickAdd";
import { CommandPalette } from "./CommandPalette";
import { TaskPanel } from "./TaskPanel";
import { Toast } from "./Toast";
import { HelpSheet } from "./HelpSheet";
import {
  relativeDate,
  type Area,
  type Task,
  type View,
  type PanelSection,
} from "./types";
import s from "./App.module.css";

const views: readonly string[] = [
  "day",
  "list",
  "week",
  "goals",
  "onboarding",
  "settings",
];
const emptyAreas: Area[] = [];
export function AppShell() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const rawDate = params.get("date");
  const validDate =
    rawDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    addDays(rawDate, 0) === rawDate
      ? rawDate
      : null;
  const rawView =
      pathname === "/app/welcome"
        ? "onboarding"
        : pathname === "/app/settings"
          ? "settings"
          : (params.get("view") ?? "day"),
    view = (views.includes(rawView) ? rawView : "day") as View;
  const planner = usePlanner(validDate),
    clock = planner.clock,
    date = validDate ?? clock?.today ?? null,
    { isAuthenticated } = useConvexAuth();
  const [overlay, setOverlay] = useState<"add" | "palette" | "help" | null>(
      null,
    ),
    [initialText, setInitialText] = useState(""),
    [section, setSection] = useState<PanelSection>();
  const [modality, setModality] = useState("keyboard");
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (pathname !== "/app") return;
    const timer = setTimeout(() => {
      if (sessionStorage.getItem("kriyan-setup-hint") === "1") {
        sessionStorage.removeItem("kriyan-setup-hint");
        setHint(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    if (
      planner.profile &&
      !planner.profile.onboardingComplete &&
      pathname !== "/app/welcome"
    )
      router.replace("/app/welcome");
    if (planner.profile?.onboardingComplete && pathname === "/app/welcome")
      router.replace("/app");
  }, [planner.profile, pathname, router]);
  const navigateUrl = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const view = next.get("view");
      const target =
        view === "settings"
          ? "/app/settings"
          : view === "onboarding"
            ? "/app/welcome"
            : "/app";
      if (target !== "/app") next.delete("view");
      router.push(`${target}?${next.toString()}`, { scroll: false });
    },
    [router],
  );
  const close = useCallback(() => {
    setOverlay(null);
    setSection(undefined);
    if (new URLSearchParams(window.location.search).has("task"))
      navigateUrl({ task: null });
  }, [navigateUrl]);
  const actions = useTaskActions(close);
  const areas = planner.areas ?? emptyAreas,
    projects = planner.projects ?? [],
    goals = planner.goals ?? [],
    tasks = planner.tasks ?? [];
  const rawArea = params.get("area") ?? "all";
  const filter =
    areas.find(
      (area) =>
        area._id === rawArea ||
        area.name.toLowerCase() === rawArea.toLowerCase(),
    )?._id ?? "all";
  const selectedId = params.get("task");
  const selected = useQuery(
    api.tasks.get,
    selectedId && isAuthenticated && !selectedId.startsWith("optimistic-")
      ? { id: selectedId as Id<"tasks"> }
      : "skip",
  );
  const open = useCallback(
    (task: Task, section?: PanelSection) => {
      if (task._id.startsWith("optimistic-")) return;
      setOverlay(null);
      setSection(section);
      navigateUrl({
        task: task._id,
        ...(task.date ? { date: task.date } : {}),
      });
    },
    [navigateUrl],
  );
  const navigate = useCallback(
    (view: View) => {
      setOverlay(null);
      navigateUrl({ view, task: null });
    },
    [navigateUrl],
  );
  const add = useCallback(
    (text = "") => {
      if (planner.areas !== undefined && !areas.length) {
        navigateUrl({ view: "settings", task: null });
        return;
      }
      setInitialText(text);
      setOverlay("add");
      if (new URLSearchParams(window.location.search).has("task"))
        navigateUrl({ task: null });
    },
    [navigateUrl, areas.length, planner.areas],
  );
  const palette = useCallback(() => {
    setOverlay("palette");
    if (new URLSearchParams(window.location.search).has("task"))
      navigateUrl({ task: null });
  }, [navigateUrl]);
  const help = useCallback(() => {
    setOverlay("help");
    if (new URLSearchParams(window.location.search).has("task"))
      navigateUrl({ task: null });
  }, [navigateUrl]);
  const setFilter = useCallback(
    (value: string) => {
      const area = areas.find((area) => area._id === value);
      navigateUrl({ area: area ? area.name.toLowerCase() : null });
    },
    [areas, navigateUrl],
  );
  const goDay = useCallback(
    (date: string) => navigateUrl({ view: "day", date, task: null }),
    [navigateUrl],
  );
  const goToday = useCallback(() => {
    if (clock) goDay(clock.today);
  }, [clock, goDay]);
  const changeDate = useCallback(
    (offset: number) => {
      if (date && clock)
        navigateUrl({
          date: offset ? addDays(date, offset) : clock.today,
          task: null,
        });
    },
    [date, clock, navigateUrl],
  );
  useEffect(() => {
    const pointer = () => setModality("pointer");
    const key = (event: KeyboardEvent) => {
      setModality("keyboard");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (overlay === "palette") close();
        else palette();
        return;
      }
      if (event.key === "Escape") {
        if (overlay || selectedId) {
          event.preventDefault();
          close();
        }
        return;
      }
      if (
        event.defaultPrevented ||
        overlay ||
        view === "onboarding" ||
        view === "settings" ||
        selectedId ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, [contenteditable=true]",
          ))
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        add();
      } else if (key === "?") {
        event.preventDefault();
        help();
      } else if (key === "t") {
        event.preventDefault();
        goToday();
      } else if (["1", "2", "3", "4"].includes(key)) {
        event.preventDefault();
        navigate((["day", "list", "week", "goals"] as const)[Number(key) - 1]);
      } else if (key === "arrowleft" || key === "arrowright") {
        event.preventDefault();
        changeDate(key === "arrowleft" ? -1 : 1);
      }
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", key);
    };
  }, [
    overlay,
    selectedId,
    close,
    palette,
    add,
    help,
    goToday,
    navigate,
    changeDate,
    view,
  ]);
  const submit = (result: QuickAddResult) => {
    const area = areas.find((area) => area._id === result.areaId),
      project = projects.find((project) => project._id === result.projectId);
    if (!area || !clock) return;
    actions.addTask(
      {
        ...result,
        areaId: area._id,
        projectId: project?._id ?? null,
        date: result.time && !result.date ? date : result.date,
      },
      `Added: ${result.date ? `${relativeDate(result.date, clock.today)}${result.time ? ` at ${result.time}` : ", any time"}` : "No date yet"}`,
    );
  };
  const defaultArea =
    areas.find((area) => area._id === filter) ??
    areas.find((area) => area.color === "green") ??
    areas[0];
  const finish = () => {
    sessionStorage.setItem("kriyan-setup-hint", "1");
    router.replace("/app");
  };
  const viewProps =
    date && clock
      ? {
          tasks,
          areas,
          projects,
          goals,
          date,
          today: clock.today,
          filter,
          setFilter,
          open,
          toggle: actions.toggle,
          add: () => add(),
          navigate: changeDate,
          loading: planner.loading,
        }
      : null;
  if (
    view === "onboarding" ||
    (planner.profile && !planner.profile.onboardingComplete)
  ) {
    return (
      <div
        className={s.app}
        data-input={modality}
        data-skeleton={planner.showSkeleton}
        data-welcome="true"
      >
        {planner.loading || !clock ? (
          <main className={s.page}>
            <p role="status">{planner.error || "Loading setup."}</p>
            {planner.error && (
              <button className={s.f} onClick={planner.retry}>
                Retry loading
              </button>
            )}
          </main>
        ) : (
          <Onboarding
            areas={areas}
            projects={projects}
            events={planner.events ?? []}
            today={clock.today}
            finish={finish}
          />
        )}
      </div>
    );
  }
  return (
    <div
      className={s.app}
      data-input={modality}
      data-skeleton={planner.showSkeleton}
    >
      <Rail
        view={view}
        navigate={navigate}
        add={() => add()}
        palette={palette}
        help={help}
      />
      <div className={s.content} aria-busy={planner.loading}>
        {hint && (
          <div className={s.status} role="status">
            Drag a task from the tray onto the timeline to schedule it. Press N
            to add a task.
            <button className={s.f} onClick={() => setHint(false)}>
              Dismiss hint
            </button>
          </div>
        )}
        {!planner.connected && !planner.loading && (
          <div className={s.status} role="status">
            Offline, changes will sync when you reconnect. Keep this tab open.
          </div>
        )}
        {(planner.error || actions.error) && (
          <div className={s.status} role="alert">
            {planner.error || actions.error}
            {planner.error ? (
              <button className={s.f} onClick={planner.retry}>
                Retry loading
              </button>
            ) : (
              <>
                <button className={s.f} onClick={actions.retry}>
                  Retry change
                </button>
                <button className={s.f} onClick={actions.clearError}>
                  Dismiss error
                </button>
              </>
            )}
          </div>
        )}
        {date && clock ? (
          view === "day" ? (
            <DayView
              day={planner.day}
              week={planner.week}
              tasks={tasks}
              goals={goals}
              areas={areas}
              projects={projects}
              profile={planner.profile ?? undefined}
              date={date}
              today={clock.today}
              now={clock.minutes}
              filter={filter}
              setFilter={setFilter}
              open={open}
              toggle={actions.toggle}
              add={() => add()}
              palette={palette}
              navigate={changeDate}
              goDay={goDay}
              goGoals={() => navigate("goals")}
              write={actions.patch}
              loading={planner.loading}
            />
          ) : view === "list" ? (
            viewProps && <ListView {...viewProps} />
          ) : view === "week" ? (
            viewProps && (
              <WeekView
                {...viewProps}
                week={planner.week}
                capacity={planner.profile?.dailyCapacityMinutes ?? 360}
                goDay={goDay}
                goGoals={() => navigate("goals")}
              />
            )
          ) : view === "goals" ? (
            viewProps && <GoalsView {...viewProps} />
          ) : planner.profile && !planner.loading ? (
            <Settings
              areas={areas}
              projects={projects}
              events={planner.events ?? []}
              habits={planner.habits ?? []}
              profile={planner.profile}
              today={clock.today}
              reset={() => {
                planner.retry();
                router.replace("/app/welcome");
              }}
            />
          ) : (
            <main className={s.page}>
              <p role="status">Loading settings.</p>
            </main>
          )
        ) : (
          <main className={s.page}>
            <p role="status">Loading your planner.</p>
          </main>
        )}
      </div>
      {overlay === "add" && clock && defaultArea && (
        <QuickAdd
          context={{
            today: clock.today,
            defaultDate: date,
            defaultAreaId: defaultArea._id,
            areas: areas.map((area) => ({ id: area._id, name: area.name })),
            projects: projects.map((project) => ({
              id: project._id,
              name: project.name,
              areaId: project.areaId,
            })),
          }}
          areas={areas}
          projects={projects}
          initialText={initialText}
          close={close}
          submit={submit}
        />
      )}
      {overlay === "palette" && clock && (
        <CommandPalette
          tasks={tasks}
          areas={areas}
          today={clock.today}
          close={close}
          add={add}
          navigate={navigate}
          goToday={goToday}
          filter={setFilter}
          help={help}
          open={open}
        />
      )}
      {overlay === "help" && <HelpSheet close={close} />}
      {selected && !overlay && clock && date && (
        <TaskPanel
          key={selected._id}
          task={selected}
          areas={areas}
          projects={projects}
          goals={goals}
          today={clock.today}
          date={date}
          section={section}
          close={close}
          toggle={actions.toggle}
          remove={actions.deleteTask}
          update={actions.edit}
          toast={
            <Toast
              message={actions.toast}
              dismiss={actions.dismiss}
              undo={actions.undo}
            />
          }
        />
      )}
      {(!selected || overlay) && (
        <Toast
          message={actions.toast}
          dismiss={actions.dismiss}
          undo={actions.undo}
        />
      )}
    </div>
  );
}
