import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import {
  addDays,
  dayValue,
  deadlineValue,
  lengthValue,
  reminderText,
  remindersValue,
  repeatText,
  timeValue,
  weekdayName,
  repeatPresets,
  monthDayChoices,
  sameRule,
  deadlineReminderPresets,
  type RepeatRule,
} from "@kriyan/core";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import {
  Check,
  Chip,
  Dot,
  Field,
  PropertyList,
  PropertyRow,
  Sheet,
  T,
  TextButton,
  s,
  ui,
} from "./ui";
import { DateField } from "./DateField";
import {
  areaColor,
  type Area,
  type Goal,
  type Project,
  type Task,
} from "./types";
type Property =
  | "Area"
  | "Project"
  | "Day"
  | "Time"
  | "Length"
  | "Deadline"
  | "Goal"
  | "Repeat"
  | "Reminders";
type Reminder = Task["reminders"][number];
export function TaskSheet({
  task,
  areas,
  projects,
  goals,
  today,
  close,
  save,
  remove,
  toggle,
  skip,
  initialProperty = null,
}: {
  task: Task;
  areas: Area[];
  projects: Project[];
  goals: Goal[];
  today: string;
  close: () => void;
  save: (patch: TaskPatch) => Promise<unknown>;
  remove: () => Promise<unknown>;
  toggle: () => Promise<unknown>;
  skip?: () => Promise<Task>;
  initialProperty?: Property | null;
}) {
  const [draft, setDraft] = useState(task),
    [open, setOpen] = useState<Property | null>(initialProperty),
    [title, setTitle] = useState(task.title),
    [notes, setNotes] = useState(task.notes),
    [customLength, setCustomLength] = useState(""),
    [every, setEvery] = useState(String(task.repeat?.every ?? 1)),
    [times, setTimes] = useState(
      String(task.repeat?.ends?.kind === "after" ? task.repeat.ends.count : 10),
    ),
    [before, setBefore] = useState("30"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  async function run(action: () => Promise<unknown>, dismiss = false) {
    setBusy(true);
    setError("");
    const write = pending.current.catch(() => undefined).then(action);
    pending.current = write;
    try {
      await write;
      if (dismiss) close();
    } catch {
      setError(
        "Task could not be saved. Check your connection and try the change again.",
      );
    } finally {
      if (pending.current === write) setBusy(false);
    }
  }
  function commit(change: TaskPatch) {
    // Clearing the day keeps only reminders that count back from the deadline.
    const patch: TaskPatch =
      change.date === null && change.reminders === undefined
        ? { ...change, reminders: draft.reminders.filter((r) => r.type === "deadline") }
        : change;
    return run(async () => {
      await save(patch);
      setDraft((previous) => ({ ...previous, ...patch }));
      if ("repeat" in patch) setEvery(String(patch.repeat?.every ?? 1));
    });
  }
  function saveText(dismiss = false) {
    if (!title.trim()) {
      setError("Task title is empty. Enter a title and try again.");
      return;
    }
    if (title === draft.title && notes === draft.notes) {
      if (dismiss) close();
      return;
    }
    void run(async () => {
      await save({ title: title.trim(), notes });
      setDraft((previous) => ({ ...previous, title: title.trim(), notes }));
    }, dismiss);
  }
  const area = areas.find((a) => a._id === draft.areaId),
    project = projects.find((p) => p._id === draft.projectId),
    deadline = deadlineValue(draft.deadline, today),
    repeat = draft.repeat,
    anchor = draft.date ?? today;
  /** The current rule with `change` applied and `drop` removed. */
  const rule = (
    change: Partial<RepeatRule>,
    drop: ("weekdays" | "monthDay" | "basis" | "ends")[] = [],
  ): RepeatRule => {
    const next: RepeatRule = { every: 1, unit: "day", ...repeat, ...change };
    for (const key of drop) delete next[key];
    return next;
  };
  const choice = (
    label: string,
    selected: boolean,
    patch: TaskPatch,
    color?: string,
    disabled = false,
  ) => (
    <Chip
      key={label}
      label={label}
      selected={selected}
      color={color}
      disabled={busy || disabled}
      onPress={() => void commit(patch)}
    />
  );
  const row = (
    label: Property,
    value: string,
    children: React.ReactNode,
    color?: string,
    urgent = false,
  ) => (
    <PropertyRow
      label={label}
      value={value}
      color={color}
      urgent={urgent}
      open={open === label}
      disabled={busy}
      onPress={() => setOpen(open === label ? null : label)}
    >
      {children}
    </PropertyRow>
  );
  const dayEditor = (isDeadline: boolean) => {
    const value = isDeadline ? draft.deadline : draft.date;
    const patch = (date: string | null): TaskPatch =>
      isDeadline
        ? { deadline: date }
        : date
          ? { date }
          : { date: null, time: null };
    return (
      <View style={s.wrap}>
        {[0, 1, 2, 3].map((offset) => {
          const date = addDays(today, offset);
          return choice(
            offset === 0
              ? "Today"
              : offset === 1
                ? "Tomorrow"
                : weekdayName(date).slice(0, 3),
            value === date,
            patch(date),
          );
        })}
        {choice(
          isDeadline ? "None" : "No date",
          value === null,
          patch(null),
          undefined,
          !isDeadline && !!draft.repeat,
        )}
        <DateField
          label="Pick a day"
          value={null}
          change={(date) => void commit(patch(date))}
        />
      </View>
    );
  };
  function addReminder(reminder: Reminder) {
    if (
      draft.reminders.some(
        (r) => JSON.stringify(r) === JSON.stringify(reminder),
      )
    )
      return;
    void commit({ reminders: [...draft.reminders, reminder] });
  }
  return (
    <Sheet
      title="Task details"
      close={() => {
        if (!busy) saveText(true);
      }}
      heading={
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: ui.spacing[1],
          }}
        >
          <Dot color={areaColor(area)} />
          <T quiet>{project?.name ?? area?.name ?? "Task"}</T>
        </View>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Check
          label={draft.status === "completed" ? "Reopen task" : "Complete task"}
          checked={draft.status === "completed"}
          color={areaColor(area)}
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await toggle();
              setDraft((previous) => ({
                ...previous,
                status: previous.status === "active" ? "completed" : "active",
              }));
            })
          }
        />
        <TextInput
          accessibilityLabel="Task title"
          maxFontSizeMultiplier={1.3}
          multiline
          value={title}
          onChangeText={setTitle}
          onBlur={() => saveText()}
          editable={!busy}
          selectionColor={ui.colors.ink}
          style={{
            flex: 1,
            minHeight: ui.control.touch,
            padding: 0,
            fontFamily: "Schibsted600",
            color: ui.colors.ink,
            fontSize: ui.typeSizes[12],
          }}
        />
      </View>
      <TextInput
        accessibilityLabel="Notes"
        maxFontSizeMultiplier={1.3}
        multiline
        placeholder="Add notes"
        placeholderTextColor={ui.colors["ink-3"]}
        value={notes}
        onChangeText={setNotes}
        onBlur={() => saveText()}
        editable={!busy}
        selectionColor={ui.colors.ink}
        style={{
          minHeight: ui.control.touch,
          marginLeft: ui.control.touch,
          color: ui.colors["ink-2"],
          fontFamily: "Schibsted400",
          fontSize: ui.type.body,
          padding: 0,
        }}
      />
      {error && <T accessibilityRole="alert">{error}</T>}
      <PropertyList>
        {row(
          "Area",
          area?.name ?? "Choose an area",
          <View style={s.wrap}>
            {areas.map((a) =>
              choice(
                a.name,
                a._id === draft.areaId,
                { areaId: a._id, projectId: null, goalId: null },
                areaColor(a),
              ),
            )}
          </View>,
          areaColor(area),
        )}
        {row(
          "Project",
          project?.name ?? "None",
          <View style={s.wrap}>
            {choice("None", !draft.projectId, { projectId: null })}
            {projects
              .filter((p) => p.areaId === draft.areaId && !p.archivedAt)
              .map((p) =>
                choice(p.name, p._id === draft.projectId, { projectId: p._id }),
              )}
          </View>,
        )}
        {row("Day", dayValue(draft.date, today), dayEditor(false))}
        {row(
          "Time",
          timeValue(draft.time, draft.durationMinutes),
          <View style={s.wrap}>
            <DateField
              label="Pick a time"
              mode="time"
              value={draft.time}
              change={(time) =>
                void commit({ time, date: draft.date ?? today })
              }
            />
            {choice("Any time", !draft.time, {
              time: null,
              reminders: draft.reminders.filter(
                (r) => r.type !== "at_start" && r.type !== "before",
              ),
            })}
          </View>,
        )}
        {row(
          "Length",
          lengthValue(draft.durationMinutes),
          <>
            {
              <View style={s.wrap}>
                {choice("None", draft.durationMinutes === null, {
                  durationMinutes: null,
                })}
                {[15, 30, 45, 60, 90, 120].map((length) =>
                  choice(
                    lengthValue(length),
                    draft.durationMinutes === length,
                    { durationMinutes: length },
                  ),
                )}
              </View>
            }
            <T quiet>
              Optional. Without a length the task shows as a marker at its start
              time.
            </T>
            <View style={s.heading}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Custom minutes"
                  value={customLength}
                  onChangeText={setCustomLength}
                  keyboardType="number-pad"
                  editable={!busy}
                />
              </View>
              <TextButton
                label="Set length"
                disabled={busy || !customLength.trim()}
                onPress={() => {
                  const minutes = Number(customLength);
                  if (
                    !Number.isInteger(minutes) ||
                    minutes < 1 ||
                    minutes > 1440
                  ) {
                    setError("Length is invalid. Enter 1 to 1440 minutes.");
                    return;
                  }
                  void commit({ durationMinutes: minutes });
                }}
              />
            </View>
          </>,
        )}
        {row(
          "Deadline",
          deadline.text,
          dayEditor(true),
          undefined,
          deadline.urgent,
        )}
        {row(
          "Goal",
          goals.find((g) => g._id === draft.goalId)?.title ?? "None",
          <View style={s.wrap}>
            {choice("None", !draft.goalId, { goalId: null })}
            {goals
              .filter((g) => g.areaId === draft.areaId && g.status === "active")
              .map((g) =>
                choice(g.title, g._id === draft.goalId, { goalId: g._id }),
              )}
          </View>,
        )}
        {row(
          "Repeat",
          repeatText(draft.repeat, draft.date),
          <>
            <View style={s.wrap}>
              {choice("Does not repeat", !draft.repeat, { repeat: null })}
              {repeatPresets(anchor).map((preset) =>
                choice(preset.label, sameRule(draft.repeat, preset.rule), {
                  repeat: preset.rule,
                  date: anchor,
                }),
              )}
            </View>
            {repeat && (
              <>
                <Field
                  label="Repeat every"
                  value={every}
                  onChangeText={setEvery}
                  keyboardType="number-pad"
                  onBlur={() => {
                    const interval = Number(every);
                    if (
                      !Number.isInteger(interval) ||
                      interval < 1 ||
                      interval > 1000
                    ) {
                      setError(
                        "Repeat interval is invalid. Enter a whole number from 1 to 1000.",
                      );
                      return;
                    }
                    void commit({ repeat: rule({ every: interval }) });
                  }}
                />
                <View style={s.wrap}>
                  {(["day", "week", "month", "year"] as const).map((unit) =>
                    choice(
                      repeat.every === 1 ? unit : `${unit}s`,
                      repeat.unit === unit,
                      { repeat: rule({ unit }, ["weekdays", "monthDay"]) },
                    ),
                  )}
                </View>
                {repeat.unit === "week" && (
                  <View style={s.wrap}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (label, day) => {
                        const selected = repeat.weekdays?.includes(day) ?? false;
                        const weekdays = selected
                          ? repeat.weekdays?.filter((d) => d !== day)
                          : [...(repeat.weekdays ?? []), day];
                        return choice(label, selected, {
                          repeat: weekdays?.length
                            ? rule({ weekdays })
                            : rule({}, ["weekdays"]),
                        });
                      },
                    )}
                  </View>
                )}
                {(repeat.unit === "month" || repeat.unit === "year") && (
                  <View style={s.wrap}>
                    {monthDayChoices(anchor).map((option) =>
                      choice(
                        option.label,
                        JSON.stringify(repeat.monthDay) ===
                          JSON.stringify(option.monthDay),
                        { date: anchor, repeat: rule({ monthDay: option.monthDay }) },
                      ),
                    )}
                  </View>
                )}
                <T quiet>Next date from</T>
                <View style={s.wrap}>
                  {choice("Its day", repeat.basis !== "completion", {
                    repeat: rule({}, ["basis"]),
                  })}
                  {choice("When done", repeat.basis === "completion", {
                    repeat: rule({ basis: "completion" }),
                  })}
                </View>
                <T quiet>Ends</T>
                <View style={s.wrap}>
                  {choice("Never", !repeat.ends, { repeat: rule({}, ["ends"]) })}
                  {choice(
                    "After a number of times",
                    repeat.ends?.kind === "after",
                    {
                      repeat: rule({
                        ends: {
                          kind: "after",
                          count:
                            repeat.ends?.kind === "after" ? repeat.ends.count : 10,
                        },
                      }),
                    },
                  )}
                  <DateField
                    label={
                      repeat.ends?.kind === "on"
                        ? `Until ${dayValue(repeat.ends.date, today)}`
                        : "On a date"
                    }
                    value={repeat.ends?.kind === "on" ? repeat.ends.date : null}
                    change={(date) =>
                      void commit({ repeat: rule({ ends: { kind: "on", date } }) })
                    }
                  />
                </View>
                {repeat.ends?.kind === "after" && (
                  <Field
                    label="Times in all"
                    value={times}
                    onChangeText={setTimes}
                    keyboardType="number-pad"
                    onBlur={() => {
                      const count = Number(times);
                      if (!Number.isInteger(count) || count < 1 || count > 1000) {
                        setError(
                          "Number of times is invalid. Enter a whole number from 1 to 1000.",
                        );
                        return;
                      }
                      void commit({
                        repeat: rule({ ends: { kind: "after", count } }),
                      });
                    }}
                  />
                )}
                {skip && draft.status === "active" && (
                  <TextButton
                    label="Skip this time"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const next = await skip();
                        setDraft((previous) => ({
                          ...previous,
                          date: next.date,
                          repeatIndex: next.repeatIndex,
                        }));
                      })
                    }
                  />
                )}
              </>
            )}
          </>,
        )}
        {row(
          "Reminders",
          remindersValue(draft.reminders),
          <>
            {draft.reminders.map((reminder, index) => (
              <View key={index} style={s.heading}>
                <T>{reminderText(reminder)}</T>
                <TextButton
                  label={`Remove ${reminderText(reminder).toLowerCase()}`}
                  disabled={busy}
                  icon="close"
                  onPress={() =>
                    void commit({
                      reminders: draft.reminders.filter((_, i) => i !== index),
                    })
                  }
                />
              </View>
            ))}
            <View style={s.wrap}>
              {(
                [
                  { label: "At start", reminder: { type: "at_start" } },
                  {
                    label: "10 min before",
                    reminder: { type: "before", minutes: 10 },
                  },
                  {
                    label: "1 hour before",
                    reminder: { type: "before", minutes: 60 },
                  },
                  { label: "Morning of", reminder: { type: "morning_of" } },
                  { label: "Day before", reminder: { type: "day_before" } },
                  ...deadlineReminderPresets,
                ] satisfies { label: string; reminder: Reminder }[]
              ).map((item) => (
                <Chip
                  key={item.label}
                  label={item.label}
                  disabled={
                    busy ||
                    draft.reminders.length >= 8 ||
                    (item.reminder.type === "deadline"
                      ? !draft.deadline
                      : !draft.date) ||
                    (!draft.time &&
                      (item.reminder.type === "at_start" ||
                        item.reminder.type === "before"))
                  }
                  onPress={() => addReminder(item.reminder)}
                />
              ))}
              {draft.date && draft.reminders.length < 8 && (
                <DateField
                  label="At a time"
                  mode="time"
                  value={null}
                  change={(time) => addReminder({ type: "at_time", time })}
                />
              )}
            </View>
            {draft.time && (
              <>
                <Field
                  label="Minutes before start"
                  value={before}
                  onChangeText={setBefore}
                  keyboardType="number-pad"
                />
                <TextButton
                  label="Add reminder before start"
                  disabled={
                    busy ||
                    !Number.isInteger(Number(before)) ||
                    Number(before) < 1 ||
                    Number(before) > 10080
                  }
                  onPress={() =>
                    addReminder({ type: "before", minutes: Number(before) })
                  }
                />
              </>
            )}
            {!draft.time && (
              <T quiet>Set a time to use At start and before reminders.</T>
            )}
            {!draft.date && !draft.deadline && (
              <T quiet>Set a day or a deadline to use reminders.</T>
            )}
          </>,
        )}
      </PropertyList>
      <TextButton
        label="Delete task"
        danger
        disabled={busy}
        onPress={() => void run(remove, true)}
      />
    </Sheet>
  );
}
