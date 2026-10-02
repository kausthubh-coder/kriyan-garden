import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as QuickActions from "expo-quick-actions";
import { useShareIntentContext } from "expo-share-intent";
import * as Haptics from "expo-haptics";
import { api } from "@kriyan/backend/convex/_generated/api";
import {
  addDays,
  countText,
  daySummary,
  formatMinutes,
  longDate,
  plannedMinutes,
  weekdayName,
  plannerCopy,
} from "@kriyan/core";
import type { TaskCreate, TaskPatch } from "@kriyan/backend/convex/validators";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { Auth } from "../src/Auth";
import { usePlanner } from "../src/usePlanner";
import { useNotifications } from "../src/notifications";
import {
  Button,
  AddTaskRow,
  Chip,
  Header,
  QuietButton,
  SectionHeading,
  SegmentedNav,
  TextButton,
  Sheet,
  Status,
  Surface,
  T,
  Icon,
  s,
  type IconName,
} from "../src/ui";
import { theme } from "../src/theme";

import { QuickAdd } from "../src/QuickAdd";
import { TaskSheet } from "../src/TaskSheet";
import { Week } from "../src/Week";
import { TaskRow } from "../src/TaskRow";
import { DayTimeline } from "../src/Timeline";
import { Onboarding } from "../src/Onboarding";
import { Settings } from "../src/Settings";
import { Goals } from "../src/Goals";
import { type Task, areaColor } from "../src/types";
type Tab = "day" | "list" | "week" | "goals";
export default function Home() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <Status loading message="Loading your account." />;
  if (!isSignedIn) return <Auth />;
  return <Planner key={userId} />;
}
function Planner() {
  const params = useLocalSearchParams<{
      view?: string;
      taskId?: string;
      add?: string;
    }>(),
    router = useRouter();
  const tab: Tab =
    params.view === "list" || params.view === "week" || params.view === "goals"
      ? params.view
      : "day";
  const [selectedDate, setSelectedDate] = useState<string | null>(null),
    [filter, setFilter] = useState("all"),
    [adding, setAdding] = useState(QuickActions.initial?.id === "add"),
    [initialText, setInitialText] = useState(""),
    [taskId, setTaskId] = useState<string | null>(null),
    [scheduling, setScheduling] = useState<Task | null>(null),
    [settings, setSettings] = useState(false),
    [addingGoal, setAddingGoal] = useState(false),
    [dragging, setDragging] = useState(false),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<{
      values: TaskCreate;
      completed: boolean;
      restoredId?: Id<"tasks">;
    } | null>(null),
    [undoBusy, setUndoBusy] = useState(false);
  const data = usePlanner(selectedDate),
    { profile, areas, projects, goals, tasks, events, day, week, date, clock } =
      data;
  const update = useMutation(api.tasks.update),
    complete = useMutation(api.tasks.complete),
    reopen = useMutation(api.tasks.reopen),
    remove = useMutation(api.tasks.remove),
    create = useMutation(api.tasks.create),
    skip = useMutation(api.tasks.skip);
  const openNotification = useCallback((id: string) => setTaskId(id), []);
  const notifications = useNotifications(
    !!profile?.onboardingComplete,
    openNotification,
  );
  const {
    hasShareIntent,
    shareIntent,
    resetShareIntent,
    error: shareError,
  } = useShareIntentContext();
  useEffect(() => {
    void QuickActions.isSupported().then((supported) => {
      if (supported)
        void QuickActions.setItems([
          {
            id: "add",
            title: "Add task",
            icon: "shortcut_add",
            params: { href: "/?add=1" },
          },
        ]);
    });
    const listener = QuickActions.addListener((action) => {
      if (action.id === "add") setAdding(true);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!undo || undoBusy) return;
    const timer = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(timer);
  }, [undo, undoBusy]);
  async function write(task: Task, patch: TaskPatch) {
    setError("");
    try {
      return await update({ id: task._id, patch });
    } catch {
      setError(
        "Task could not be updated. Reconnect and try the change again.",
      );
      return null;
    }
  }
  async function toggle(task: Task) {
    setError("");
    try {
      const result =
        task.status === "completed"
          ? await reopen({ id: task._id })
          : await complete({ id: task._id });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return result;
    } catch {
      setError("Task status could not be saved. Reconnect and try again.");
      return null;
    }
  }
  if (data.error) return <Status message={data.error} retry={data.retry} />;
  if (
    data.loading ||
    !profile ||
    !areas ||
    !projects ||
    !goals ||
    !tasks ||
    !events ||
    !day ||
    !week
  )
    return <Status loading message="Loading your planner." />;
  if (!profile.onboardingComplete)
    return (
      <Onboarding
        areas={areas}
        projects={projects}
        events={events}
        today={clock.today}
      />
    );
  if (settings)
    return (
      <Settings
        areas={areas}
        projects={projects}
        events={events}
        profile={profile}
        today={clock.today}
        close={() => setSettings(false)}
        notifications={notifications}
      />
    );
  const shown = tasks.filter(
      (task) => filter === "all" || task.areaId === filter,
    ),
    dated = shown.filter((task) => task.date === date),
    active = dated.filter((task) => task.status === "active");
  const firstRun = !tasks.length && profile.onboardingDraft?.["planner.firstTaskAdded"] !== "1";
  const summary = dated.length ? daySummary({
    left: active.length,
    total: dated.length,
    plannedMinutes: plannedMinutes(dated),
    // Keep the compact header to the reference's count and planned time.
    // No-length tasks retain their outlined markers and property value.
    withoutLength: 0,
    hideEmptyCount: true,
  }) : filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : firstRun ? plannerCopy.firstDay : plannerCopy.emptyDay;
  const currentTaskId = taskId ?? params.taskId;
  const selected = tasks.find((task) => task._id === currentTaskId);
  const row = (task: Task) => (
    <TaskRow
      key={task._id}
      task={task}
      area={areas.find((a) => a._id === task.areaId)}
      project={projects.find((p) => p._id === task.projectId)?.name}
      today={clock.today}
      open={() => setTaskId(task._id)}
      toggle={() => toggle(task)}
      schedule={() => {
        setTaskId(task._id);
        setScheduling(task);
      }}
    />
  );
  const switchTab = (view: Tab) => {
    router.setParams({ view });
    setTaskId(null);
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.page, { flex: 1 }]}>
        <Header
          title={
            tab === "day"
              ? weekdayName(date)
              : tab === "list"
                ? date === clock.today
                  ? "Today"
                  : weekdayName(date)
                : tab === "week"
                  ? "Week"
                  : "Goals"
          }
          right={
            tab === "goals" ? (
              <QuietButton
                label="Add goal"
                icon="plus"
                showLabel
                onPress={() => setAddingGoal(true)}
              />
            ) : (
              <View style={{ flexDirection: "row" }}>
                <SegmentedNav
                  unit={tab === "week" ? "week" : "day"}
                  previous={() =>
                    setSelectedDate(addDays(date, tab === "week" ? -7 : -1))
                  }
                  today={() => setSelectedDate(null)}
                  next={() =>
                    setSelectedDate(addDays(date, tab === "week" ? 7 : 1))
                  }
                />
                <TextButton
                  label="Settings"
                  icon="settings"
                  onPress={() => setSettings(true)}
                />
              </View>
            )
          }
          summary={
            tab === "goals"
              ? undefined
              : tab === "week"
                ? `${longDate(week[0]?.date ?? date)} to ${longDate(week[6]?.date ?? date)}. ${formatMinutes(week.reduce((sum, day) => sum + day.plannedMinutes, 0))} planned.`
                : `${longDate(date)}. ${summary}`
          }
        />
        <View style={s.wrap}>
          <Chip
            label="All"
            selected={filter === "all"}
            onPress={() => setFilter("all")}
          />
          {areas.map((area) => (
            <Chip
              key={area._id}
              label={area.name}
              color={areaColor(area)}
              selected={filter === area._id}
              onPress={() => setFilter(area._id)}
            />
          ))}
        </View>
        {!data.connected && (
          <T quiet accessibilityLiveRegion="polite">Offline, changes will sync</T>
        )}
        <ScrollView style={{ flex: 1 }} scrollEnabled={!dragging} keyboardShouldPersistTaps="handled">
        {error && <Status message={error} retry={() => setError("")} />}
        {shareError && (
          <T accessibilityRole="alert">
            Shared text could not load. Try sharing it again.
          </T>
        )}
        {tab === "day" && (
          <DayTimeline
            day={{
              ...day,
              timed: day.timed.filter(
                (t) => filter === "all" || t.areaId === filter,
              ),
              anytime: day.anytime.filter(
                (t) => filter === "all" || t.areaId === filter,
              ),
              unscheduled: day.unscheduled.filter(
                (t) => filter === "all" || t.areaId === filter,
              ),
              events: day.events.filter(
                (e) => filter === "all" || e.areaId === filter,
              ),
            }}
            areas={areas}
            projects={projects}
            toggle={toggle}
            schedule={(task) => {
              setTaskId(task._id);
              setScheduling(task);
            }}
            profile={profile}
            today={clock.today}
            now={clock.minutes}
            open={(task) => setTaskId(task._id)}
            update={write}
            dragging={setDragging}
            firstRun={firstRun}
            add={(text = "") => { setInitialText(text); setAdding(true); }}
          />
        )}
        {tab === "list" && (
          <>
            <AddTaskRow onPress={() => setAdding(true)} />
            {!dated.length && (
              <T quiet>{filter === "all" ? date === clock.today ? plannerCopy.emptyList : `Nothing planned for ${weekdayName(date)}.` : `Nothing in ${areas.find((area) => area._id === filter)?.name}.`}</T>
            )}
            {areas
              .filter((a) => filter === "all" || a._id === filter)
              .map((area) => {
                const entries = dated.filter((t) => t.areaId === area._id);
                return entries.length ? (
                  <View key={area._id}>
                    <SectionHeading
                      title={area.name}
                      color={areaColor(area)}
                      value={[entries.some((task) => task.status === "active") ? `${countText(entries.filter((task) => task.status === "active").length, "task")} left` : "", plannedMinutes(entries) ? formatMinutes(plannedMinutes(entries)) : ""].filter(Boolean).join(", ") || undefined}
                    />
                    {entries.map(row)}
                  </View>
                ) : null;
              })}
            <T style={s.subtitle}>No date yet</T>
            {shown.filter((t) => t.date === null && t.status === "active")
              .length ? (
              shown
                .filter((t) => t.date === null && t.status === "active")
                .map(row)
            ) : (
              <T quiet>No undated tasks.</T>
            )}
          </>
        )}
        {tab === "week" && (
          <Week
            week={week}
            date={date}
            today={clock.today}
            profile={profile}
            areas={areas}
            tasks={tasks}
            shown={shown}
            select={setSelectedDate}
            row={row}
            open={(task) => setTaskId(task._id)}
          />
        )}
        {tab === "goals" && (
          <Goals
            goals={goals.filter((g) => filter === "all" || g.areaId === filter)}
            areas={areas}
            today={clock.today}
            tasks={tasks}
            openTask={(task) => setTaskId(task._id)}
            adding={addingGoal}
            closeAdd={() => setAddingGoal(false)}
            toggle={toggle}
            schedule={(task) => {
              setTaskId(task._id);
              setScheduling(task);
            }}
          />
        )}
        </ScrollView>
      </View>
      {undo && (
        <View
          style={[
            s.heading,
            { padding: theme.spacing[1], backgroundColor: theme.colors.s2 },
          ]}
        >
          <T>Task deleted.</T>
          <Button
            label="Undo delete"
            disabled={undoBusy}
            onPress={() => {
              setUndoBusy(true);
              void (async () => {
                const id =
                  undo.restoredId ??
                  (
                    await create({
                      ...undo.values,
                      ...(undo.completed
                        ? { repeat: null, reminders: [] }
                        : {}),
                    })
                  )._id;
                setUndo({ ...undo, restoredId: id });
                if (undo.completed) {
                  await complete({ id });
                  await update({
                    id,
                    patch: {
                      repeat: undo.values.repeat ?? null,
                      reminders: undo.values.reminders ?? [],
                    },
                  });
                }
                setUndo(null);
              })()
                .catch(() =>
                  setError(
                    "Task could not be restored. Reconnect and retry undo.",
                  ),
                )
                .finally(() => setUndoBusy(false));
            }}
          />
        </View>
      )}
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["day", "list", "add", "week", "goals"] as const).map((view) =>
          view === "add" ? (
            <Button
              key={view}
              label="Add a task"
              icon="plus"
              primary
              style={{
                borderRadius: theme.layout.phoneAddSize / 2,
                width: theme.layout.phoneAddSize,
                height: theme.layout.phoneAddSize,
              }}
              onPress={() => {
                setInitialText("");
                setAdding(true);
              }}
            />
          ) : (
            <Surface
              key={view}
              role="tab"
              state={{ selected: tab === view }}
              label={view[0].toUpperCase() + view.slice(1)}
              onPress={() => switchTab(view)}
              style={styles.tab}
            >
              <Icon
                name={view as IconName}
                color={tab === view ? theme.colors.ink : theme.colors["ink-3"]}
              />
              <T
                style={{
                  fontSize: theme.typeSizes[0],
                  lineHeight: theme.typeSizes[0] * 1.3,
                  color:
                    tab === view ? theme.colors.ink : theme.colors["ink-3"],
                }}
              >
                {view[0].toUpperCase() + view.slice(1)}
              </T>
            </Surface>
          ),
        )}
      </View>
      {(adding || hasShareIntent || params.add === "1") && (
        <QuickAdd
          initialText={
            hasShareIntent
              ? (shareIntent.text ?? shareIntent.webUrl ?? "")
              : initialText
          }
          today={clock.today}
          date={date}
          areas={areas}
          projects={projects}
          close={() => {
            setAdding(false);
            resetShareIntent();
            setInitialText("");
            router.setParams({ add: undefined });
          }}
        />
      )}
      {selected && (
        <TaskSheet
          key={`${selected._id}-${scheduling ? "day" : "task"}`}
          initialProperty={scheduling ? "Day" : null}
          task={selected}
          areas={areas}
          projects={projects}
          goals={goals}
          today={clock.today}
          close={() => {
            setTaskId(null);
            setScheduling(null);
            router.setParams({ taskId: undefined });
          }}
          save={(patch) => update({ id: selected._id, patch })}
          skip={() => skip({ id: selected._id })}
          toggle={() =>
            selected.status === "completed"
              ? reopen({ id: selected._id })
              : complete({ id: selected._id })
          }
          remove={async () => {
            await remove({ id: selected._id });
            const {
              title,
              areaId,
              projectId,
              goalId,
              date,
              time,
              durationMinutes,
              deadline,
              repeat,
              reminders,
              notes,
              sortOrder,
            } = selected;
            setUndo({
              completed: selected.status === "completed",
              values: {
                title,
                areaId,
                projectId,
                goalId,
                date,
                time,
                durationMinutes,
                deadline,
                repeat,
                reminders,
                notes,
                sortOrder,
              },
            });
          }}
        />
      )}
      {currentTaskId && !selected && (
        <Sheet
          title="Task unavailable"
          close={() => {
            setTaskId(null);
            router.setParams({ taskId: undefined });
          }}
        >
          <T>This task is no longer available. It may have been deleted.</T>
        </Sheet>
      )}
      {!notifications.prompted && (
        <Sheet
          title="Task reminders"
          close={() => void notifications.markPrompted()}
        >
          <T>
            Allow notifications so task reminders reach this phone, including
            tasks added on the web.
          </T>
          <Button
            label="Enable notifications"
            primary
            onPress={() => void notifications.enable()}
          />
          <Button
            label="Skip notifications"
            onPress={() => void notifications.markPrompted()}
          />
        </Sheet>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: theme.spacing[1],
    borderTopWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.bg,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    width: theme.layout.phoneTabWidth,
    minHeight: theme.layout.phoneTabHeight,
  },
});
