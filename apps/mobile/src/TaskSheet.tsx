import { useState } from "react";
import { View } from "react-native";
import { addDays, formatMinutes } from "@kriyan/core";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import { Button, Choices, Field, Sheet, T, s } from "./ui";
import { DateField } from "./DateField";
import {
  areaColor,
  type Area,
  type Goal,
  type Project,
  type Task,
} from "./types";
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
}) {
  const [title, setTitle] = useState(task.title),
    [date, setDate] = useState(task.date),
    [time, setTime] = useState(task.time),
    [length, setLength] = useState(
      task.durationMinutes === null ? "" : String(task.durationMinutes),
    ),
    [deadline, setDeadline] = useState(task.deadline),
    [areaId, setAreaId] = useState(task.areaId),
    [projectId, setProjectId] = useState(task.projectId),
    [goalId, setGoalId] = useState(task.goalId),
    [notes, setNotes] = useState(task.notes),
    [repeat, setRepeat] = useState(task.repeat),
    [every, setEvery] = useState(String(task.repeat?.every ?? 1)),
    [reminders, setReminders] = useState(task.reminders),
    [reminderKind, setReminderKind] = useState<Reminder["type"]>("morning_of"),
    [before, setBefore] = useState("15"),
    [reminderTime, setReminderTime] = useState("09:00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: () => Promise<unknown>, dismiss = false) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (dismiss) close();
    } catch {
      setError("Task could not be saved. Check the task fields and your connection, then try saving again.");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!title.trim()) {
      setError("Task title is empty. Enter a title and try saving again.");
      return;
    }
    const durationMinutes = length.trim() ? Number(length) : null;
    if (
      durationMinutes !== null &&
      (!Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 1440)
    ) {
      setError("Length is invalid. Enter 1 to 1440 minutes or leave it empty.");
      return;
    }
    if (
      repeat &&
      (!Number.isInteger(Number(every)) ||
        Number(every) < 1 ||
        Number(every) > 1000)
    ) {
      setError(
        "Repeat interval is invalid. Enter a whole number from 1 to 1000.",
      );
      return;
    }
    await run(
      () =>
        save({
          title,
          date,
          time: date ? time : null,
          durationMinutes,
          deadline,
          areaId,
          projectId,
          goalId,
          notes,
          repeat: repeat ? { ...repeat, every: Number(every) } : null,
          reminders,
        }),
      true,
    );
  }
  const kinds: { value: Reminder["type"]; label: string }[] = [
    { value: "at_start", label: "At start" },
    { value: "before", label: "Before start" },
    { value: "morning_of", label: "Morning of" },
    { value: "day_before", label: "Day before" },
    { value: "at_time", label: "At a time" },
  ];
  return (
    <Sheet title="Task details" close={close}>
      <Field
        label="Task title"
        value={title}
        onChangeText={setTitle}
        editable={!busy}
      />
      <Button
        label={task.status === "completed" ? "Reopen task" : "Complete task"}
        disabled={busy}
        onPress={() => void run(toggle, true)}
      />
      <Choices
        label="Area"
        value={areaId}
        choices={areas.map((area) => ({
          value: area._id,
          label: area.name,
          color: areaColor(area),
        }))}
        change={(id) => {
          setAreaId(id);
          if (projects.find((p) => p._id === projectId)?.areaId !== id)
            setProjectId(null);
        }}
      />
      <Choices
        label="Project or course"
        value={projectId ?? "none"}
        choices={[
          { value: "none", label: "None" },
          ...projects
            .filter((p) => p.areaId === areaId && !p.archivedAt)
            .map((p) => ({ value: p._id, label: p.name })),
        ]}
        change={(id) =>
          setProjectId(projects.find((p) => p._id === id)?._id ?? null)
        }
      />
      <View style={s.field}>
        <T quiet>Day</T>
        <View style={s.wrap}>
          <Button
            label="Today"
            selected={date === today}
            onPress={() => setDate(today)}
          />
          <Button
            label="Tomorrow"
            selected={date === addDays(today, 1)}
            onPress={() => setDate(addDays(today, 1))}
          />
          <Button
            label="No date"
            disabled={!!repeat}
            selected={date === null}
            onPress={() => {
              setDate(null);
              setTime(null);
            }}
          />
        </View>
      </View>
      <DateField label="Pick a day" value={date} change={setDate} />
      <DateField
        label="Start time"
        value={time}
        mode="time"
        change={(value) => {
          setTime(value);
          setDate(date ?? today);
        }}
      />
      <Button
        label="Any time"
        selected={time === null}
        onPress={() => setTime(null)}
      />
      <T quiet>Length is optional. Leave it empty for a marker.</T>
      <View style={s.wrap}>
        <Button
          label="No length"
          selected={!length}
          onPress={() => setLength("")}
        />
        {[15, 30, 45, 60, 90, 120].map((value) => (
          <Button
            key={value}
            label={formatMinutes(value)}
            selected={length === String(value)}
            onPress={() => setLength(String(value))}
          />
        ))}
      </View>
      <Field
        label="Length in minutes"
        value={length}
        onChangeText={setLength}
        keyboardType="number-pad"
      />
      <DateField label="Deadline" value={deadline} change={setDeadline} />
      <Button
        label="Remove deadline"
        onPress={() => setDeadline(null)}
        disabled={!deadline}
      />
      <Choices
        label="Goal"
        value={goalId ?? "none"}
        choices={[
          { value: "none", label: "None" },
          ...goals.map((goal) => ({ value: goal._id, label: goal.title })),
        ]}
        change={(id) => setGoalId(goals.find((g) => g._id === id)?._id ?? null)}
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Choices
        label="Repeat"
        value={repeat?.unit ?? "none"}
        choices={[
          { value: "none", label: "None" },
          { value: "day", label: "Daily" },
          { value: "week", label: "Weekly" },
          { value: "month", label: "Monthly" },
          { value: "year", label: "Yearly" },
        ]}
        change={(unit) => {
          if (unit === "none") setRepeat(null);
          else if (
            unit === "day" ||
            unit === "week" ||
            unit === "month" ||
            unit === "year"
          ) {
            setRepeat({ unit, every: 1 });
            setDate(date ?? today);
          }
        }}
      />
      {repeat && (
        <Field
          label="Repeat every"
          keyboardType="number-pad"
          value={every}
          onChangeText={setEvery}
        />
      )}
      {repeat?.unit === "week" && (
        <View style={s.wrap}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (label, day) => (
              <Button
                key={label}
                label={label}
                selected={repeat.weekdays?.includes(day)}
                onPress={() => {
                  const weekdays = repeat.weekdays?.includes(day)
                    ? repeat.weekdays.filter((v) => v !== day)
                    : [...(repeat.weekdays ?? []), day];
                  setRepeat({
                    ...repeat,
                    ...(weekdays.length
                      ? { weekdays }
                      : { weekdays: undefined }),
                  });
                }}
              />
            ),
          )}
        </View>
      )}
      <Choices
        label="Reminders"
        value={reminderKind}
        choices={kinds}
        change={setReminderKind}
      />
      {reminderKind === "before" && (
        <Field
          label="Minutes before start"
          value={before}
          onChangeText={setBefore}
          keyboardType="number-pad"
        />
      )}
      {reminderKind === "at_time" && (
        <DateField
          label="Reminder time"
          value={reminderTime}
          mode="time"
          change={setReminderTime}
        />
      )}
      <Button
        label="Add reminder"
        disabled={
          !date ||
          reminders.length >= 20 ||
          (!time && (reminderKind === "at_start" || reminderKind === "before"))
        }
        onPress={() => {
          if (
            reminderKind === "before" &&
            (!Number.isInteger(Number(before)) || Number(before) < 1)
          ) {
            setError(
              "Reminder minutes are invalid. Enter a positive whole number.",
            );
            return;
          }
          const next: Reminder =
            reminderKind === "before"
              ? { type: "before", minutes: Number(before) }
              : reminderKind === "at_time"
                ? { type: "at_time", time: reminderTime }
                : { type: reminderKind };
          if (
            !reminders.some((r) => JSON.stringify(r) === JSON.stringify(next))
          )
            setReminders([...reminders, next]);
        }}
      />
      {!date && <T quiet>Set a day to schedule reminders.</T>}
      {!time && <T quiet>At start and Before start need a task time.</T>}
      {reminders.map((r, index) => (
        <View key={index} style={s.heading}>
          <T>
            {r.type === "before"
              ? `${r.minutes}m before start`
              : r.type === "at_time"
                ? `At ${r.time}`
                : kinds.find((k) => k.value === r.type)?.label}
          </T>
          <Button
            label="Remove reminder"
            onPress={() =>
              setReminders(reminders.filter((_, i) => i !== index))
            }
          />
        </View>
      ))}
      {error && <T accessibilityRole="alert">{error}</T>}
      <Button
        label="Save task"
        primary
        disabled={busy}
        onPress={() => void submit()}
      />
      <Button
        label="Delete task"
        disabled={busy}
        onPress={() => void run(remove, true)}
      />
    </Sheet>
  );
}
