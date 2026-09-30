import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as QuickActions from "expo-quick-actions";
import { useShareIntentContext } from "expo-share-intent";
import * as Haptics from "expo-haptics";
import { api } from "@kriyan/backend/convex/_generated/api";
import { addDays, formatMinutes, plannedMinutes } from "@kriyan/core";
import type { TaskCreate, TaskPatch } from "@kriyan/backend/convex/validators";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { Auth } from "../src/Auth";
import { usePlanner } from "../src/usePlanner";
import { useNotifications } from "../src/notifications";
import {
  Button,
  Choices,
  Sheet,
  Status,
  Surface,
  T,
  Icon,
  s,
  type IconName,
} from "../src/ui";
import { theme } from "../src/theme";
import { dayLabel, dateLabel } from "../src/helpers";
import { QuickAdd } from "../src/QuickAdd";
import { TaskSheet } from "../src/TaskSheet";
import { DateField } from "../src/DateField";
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
    [dragging, setDragging] = useState(false),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<{ values: TaskCreate; completed: boolean; restoredId?: Id<"tasks"> } | null>(null),
    [undoBusy, setUndoBusy] = useState(false);
  const data = usePlanner(selectedDate),
    { profile, areas, projects, goals, tasks, events, day, week, date, clock } =
      data;
  const update = useMutation(api.tasks.update),
    complete = useMutation(api.tasks.complete),
    reopen = useMutation(api.tasks.reopen),
    remove = useMutation(api.tasks.remove),
    create = useMutation(api.tasks.create);
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
          { id: "add", title: "Add task", params: { href: "/?add=1" } },
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
  const summary = dated.length
    ? `${active.length} tasks left${plannedMinutes(dated) ? `, ${formatMinutes(plannedMinutes(dated))} planned` : ""}${active.some((t) => t.durationMinutes === null) ? `, ${active.filter((t) => t.durationMinutes === null).length} with no length` : ""}.`
    : "Nothing planned.";
  const currentTaskId = taskId ?? params.taskId;
  const selected = tasks.find((task) => task._id === currentTaskId);
  const row = (task: Task) => (
    <TaskRow
      key={task._id}
      task={task}
      area={areas.find((a) => a._id === task.areaId)}
      open={() => setTaskId(task._id)}
      toggle={() => toggle(task)}
      schedule={() => setScheduling(task)}
    />
  );
  const switchTab = (view: Tab) => {
    router.setParams({ view });
    setTaskId(null);
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <View style={s.heading}>
          <View style={{ flex: 1 }}>
            <T title>
              {tab === "day" || tab === "list"
                ? dayLabel(date)
                : tab === "week"
                  ? "This week"
                  : "Goals"}
            </T>
            <T quiet>
              {tab === "goals"
                ? `${goals.filter((g) => g.status === "active").length} active`
                : dateLabel(date)}
            </T>
          </View>
          <Button
            label="Open settings"
            icon="settings"
            onPress={() => setSettings(true)}
          />
        </View>
        {tab !== "goals" && (
          <>
            <T quiet>{summary}</T>
            <View style={s.wrap}>
              <Button
                label="Previous day"
                icon="prev"
                onPress={() => setSelectedDate(addDays(date, -1))}
              />
              <Button label="Today" onPress={() => setSelectedDate(null)} />
              <Button
                label="Next day"
                icon="next"
                onPress={() => setSelectedDate(addDays(date, 1))}
              />
            </View>
          </>
        )}
        <Choices
          label="Areas"
          value={filter}
          choices={[
            { value: "all", label: "All" },
            ...areas.map((a) => ({
              value: a._id,
              label: a.name,
              color: areaColor(a),
            })),
          ]}
          change={setFilter}
        />
        {!data.connected && (
          <T quiet accessibilityLiveRegion="polite">
            Offline, changes will sync
          </T>
        )}
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
              events: day.events.filter(
                (e) => filter === "all" || e.areaId === filter,
              ),
            }}
            areas={areas}
            profile={profile}
            today={clock.today}
            now={clock.minutes}
            open={(task) => setTaskId(task._id)}
            update={write}
            dragging={setDragging}
          />
        )}
        {tab === "list" && (
          <>
            <Button label="Add task" onPress={() => setAdding(true)} />
            {!dated.length && (
              <Status message="Nothing planned for this day. Add a task to begin." />
            )}
            {areas
              .filter((a) => filter === "all" || a._id === filter)
              .map((area) => {
                const entries = dated.filter((t) => t.areaId === area._id);
                return entries.length ? (
                  <View key={area._id}>
                    <T
                      style={{
                        fontFamily: "Schibsted600",
                        color: areaColor(area),
                      }}
                    >
                      {area.name}
                    </T>
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
          <>
            <View
              style={[s.wrap, { flexWrap: "nowrap", gap: theme.spacing[0] }]}
            >
              {week.map((d) => (
                <Surface
                  key={d.date}
                  label={`Select ${dayLabel(d.date)}, ${d.date}`}
                  onPress={() => setSelectedDate(d.date)}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing[1],
                    backgroundColor:
                      d.date === date ? theme.colors.s2 : theme.colors.bg,
                    borderRadius: theme.radii[0],
                  }}
                >
                  <T
                    quiet
                    style={{
                      textAlign: "center",
                      fontSize: theme.typeSizes[1],
                    }}
                  >
                    {dayLabel(d.date).slice(0, 3)}
                  </T>
                  <T style={{ textAlign: "center" }}>
                    {Number(d.date.slice(-2))}
                  </T>
                  <View
                    style={{
                      height: theme.spacing[1],
                      backgroundColor: theme.colors.s3,
                    }}
                  >
                    {areas.map((area, index) => (
                      <View
                        key={area._id}
                        style={{
                          position: "absolute",
                          height: "100%",
                          left: `${(areas.slice(0, index).reduce((sum, a) => sum + (d.plannedMinutesByArea[a._id] ?? 0), 0) / Math.max(d.plannedMinutes, profile.dailyCapacityMinutes)) * 100}%`,
                          width: `${((d.plannedMinutesByArea[area._id] ?? 0) / Math.max(d.plannedMinutes, profile.dailyCapacityMinutes)) * 100}%`,
                          backgroundColor: areaColor(area),
                        }}
                      />
                    ))}
                  </View>
                  <T quiet style={{ fontSize: theme.typeSizes[0] }}>
                    {formatMinutes(d.plannedMinutes)}
                    {d.plannedMinutes > profile.dailyCapacityMinutes
                      ? ", over"
                      : ""}
                  </T>
                </Surface>
              ))}
            </View>
            <T style={s.subtitle}>{dayLabel(date)}</T>
            {dated.length ? (
              dated.map(row)
            ) : (
              <T quiet>Nothing planned for this day.</T>
            )}
            <T style={s.subtitle}>Deadlines</T>
            {shown.filter((t) => t.deadline && t.status === "active").length ? (
              shown
                .filter((t) => t.deadline && t.status === "active")
                .sort((a, b) =>
                  (a.deadline ?? "").localeCompare(b.deadline ?? ""),
                )
                .map(row)
            ) : (
              <T quiet>No upcoming deadlines.</T>
            )}
          </>
        )}
        {tab === "goals" && (
          <Goals
            goals={goals.filter((g) => filter === "all" || g.areaId === filter)}
            areas={areas}
            today={clock.today}
            tasks={tasks}
            openTask={(task) => setTaskId(task._id)}
          />
        )}
      </ScrollView>
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
                const id = undo.restoredId ?? (await create({ ...undo.values, ...(undo.completed ? { repeat: null, reminders: [] } : {}) }))._id;
                setUndo({ ...undo, restoredId: id });
                if (undo.completed) {
                  await complete({ id });
                  await update({ id, patch: { repeat: undo.values.repeat ?? null, reminders: undo.values.reminders ?? [] } });
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
              style={{ borderRadius: theme.layout.phoneAddSize / 2, width: theme.layout.phoneAddSize, height: theme.layout.phoneAddSize }}
              onPress={() => {
                setInitialText("");
                setAdding(true);
              }}
            />
          ) : (
            <Surface
              key={view}
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
          initialText={hasShareIntent ? shareIntent.text ?? shareIntent.webUrl ?? "" : initialText}
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
          key={selected._id}
          task={selected}
          areas={areas}
          projects={projects}
          goals={goals}
          today={clock.today}
          close={() => {
            setTaskId(null);
            router.setParams({ taskId: undefined });
          }}
          save={(patch) => update({ id: selected._id, patch })}
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
        <Sheet title="Task unavailable" close={() => { setTaskId(null); router.setParams({ taskId: undefined }); }}>
          <T>This task is no longer available. It may have been deleted.</T>
        </Sheet>
      )}
      {scheduling && (
        <Sheet title="Schedule task" close={() => setScheduling(null)}>
          <Button
            label="Today"
            onPress={() =>
              void write(scheduling, { date: clock.today }).then((result) => {
                if (result) setScheduling(null);
              })
            }
          />
          <Button
            label="Tomorrow"
            onPress={() =>
              void write(scheduling, { date: addDays(clock.today, 1) }).then(
                (result) => {
                  if (result) setScheduling(null);
                },
              )
            }
          />
          <DateField
            label="Pick a day"
            value={scheduling.date}
            change={(value) =>
              void write(scheduling, { date: value }).then((result) => {
                if (result) setScheduling(null);
              })
            }
          />
          <Button
            label="Any time"
            onPress={() =>
              void write(scheduling, {
                date: scheduling.date ?? clock.today,
                time: null,
              }).then((result) => {
                if (result) setScheduling(null);
              })
            }
          />
          {error && <T accessibilityRole="alert">{error}</T>}
        </Sheet>
      )}
      {!notifications.prompted && (
        <Sheet title="Task reminders" close={() => void notifications.markPrompted()}>
          <T>
            Allow notifications so task reminders reach this phone, including
            tasks added on the web.
          </T>
          <Button
            label="Enable notifications"
            primary
            onPress={() =>
              void notifications.enable()
            }
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
    height: theme.layout.phoneTabHeight,
  },
});
