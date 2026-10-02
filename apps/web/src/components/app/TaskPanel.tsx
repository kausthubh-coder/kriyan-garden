"use client";
import { useState, type ReactNode } from "react";
import { plannerError } from "@/lib/planner-error";
import {
  dayValue,
  timeValue,
  lengthValue,
  deadlineValue,
  repeatText,
  remindersValue,
  reminderText,
  addedDate,
  formatMinutes,
  weekdayName,
  addDays,
  repeatPresets,
  monthDayChoices,
  sameRule,
  deadlineReminderPresets,
  type RepeatRule,
} from "@kriyan/core";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Check } from "./Check";
import { PropertyList, type Property } from "./PropertyList";
import { AutoTextarea } from "./AutoTextarea";
import { DateEditor } from "./DateEditor";
import {
  areaColor,
  projectName,
  type Area,
  type Goal,
  type Project,
  type Task,
  type PanelSection,
  type Variables,
} from "./types";
import s from "./App.module.css";

type Reminder = Task["reminders"][number];
export function TaskPanel({
  task,
  areas,
  projects,
  goals,
  today,
  date,
  section,
  close,
  toggle,
  remove,
  update,
  skip,
  toast,
}: {
  task: Task;
  areas: Area[];
  projects: Project[];
  goals: Goal[];
  today: string;
  date: string;
  section?: PanelSection;
  close: () => void;
  toggle: (task: Task) => void;
  remove: (task: Task) => void;
  update: (task: Task, patch: TaskPatch) => Promise<Task>;
  skip?: (task: Task) => Promise<void>;
  toast?: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(section ?? null);
  const [error, setError] = useState(""),
    [failedPatch, setFailedPatch] = useState<TaskPatch | null>(null);
  const [atTime, setAtTime] = useState(false),
    [reminderTime, setReminderTime] = useState("09:00");
  const [endPicker, setEndPicker] = useState(false),
    [beforeAmount, setBeforeAmount] = useState("30"),
    [beforeUnit, setBeforeUnit] = useState<"min" | "hour" | "day">("min");
  const area = areas.find((area) => area._id === task.areaId),
    repeat = task.repeat,
    anchor = task.date ?? date;
  const factor = beforeUnit === "day" ? 1440 : beforeUnit === "hour" ? 60 : 1,
    amount = Number(beforeAmount),
    beforeMinutes =
      Number.isInteger(amount) && amount >= 1 && amount * factor <= 10080
        ? amount * factor
        : null;
  /** The current rule with `change` applied and `drop` removed. */
  const rule = (
    change: Partial<RepeatRule>,
    drop: ("weekdays" | "monthDay" | "basis" | "ends")[] = [],
  ): RepeatRule => {
    const next: RepeatRule = { every: 1, unit: "day", ...repeat, ...change };
    for (const key of drop) delete next[key];
    return next;
  };
  const deadline = deadlineValue(task.deadline, today);
  const save = async (patch: TaskPatch) => {
    setError("");
    setFailedPatch(null);
    try {
      await update(task, patch);
    } catch (failure) {
      setFailedPatch(patch);
      setError(
        plannerError(failure, "Task could not be saved. Try saving it again."),
      );
    }
  };
  const chip = (
    label: string,
    on: boolean,
    patch: TaskPatch,
    disabled = false,
  ) => (
    <button
      type="button"
      className={`${s.f} ${on ? s.on : ""}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => void save(patch)}
    >
      {label}
    </button>
  );
  const addReminder = (reminder: Reminder) => {
    if (
      !task.reminders.some(
        (current) => JSON.stringify(current) === JSON.stringify(reminder),
      )
    )
      void save({ reminders: [...task.reminders, reminder] });
  };
  const reminderChip = (
    label: string,
    reminder: Reminder,
    disabled = false,
  ) => (
    <button
      type="button"
      className={s.f}
      disabled={
        disabled ||
        task.reminders.some(
          (current) => JSON.stringify(current) === JSON.stringify(reminder),
        )
      }
      onClick={() => addReminder(reminder)}
    >
      {label}
    </button>
  );
  const rows: Property[] = [
    {
      id: "area",
      label: "Area",
      empty: !area,
      value: (
        <>
          <i className={s.dot} />
          {area?.name ?? "None"}
        </>
      ),
      editor: areas.map((area) => (
        <button
          key={area._id}
          type="button"
          className={`${s.f} ${task.areaId === area._id ? s.on : ""}`}
          aria-pressed={task.areaId === area._id}
          style={{ "--c": areaColor(area) } as Variables}
          onClick={() =>
            void save({
              areaId: area._id,
              projectId:
                projects.find((project) => project._id === task.projectId)
                  ?.areaId === area._id
                  ? task.projectId
                  : null,
              goalId:
                goals.find((goal) => goal._id === task.goalId)?.areaId ===
                area._id
                  ? task.goalId
                  : null,
            })
          }
        >
          <i className={s.dot} />
          {area.name}
        </button>
      )),
    },
    {
      id: "project",
      label: "Project",
      empty: !task.projectId,
      value:
        projects.find((project) => project._id === task.projectId)?.name ??
        "None",
      editor: (
        <>
          {chip("None", !task.projectId, { projectId: null })}
          {projects
            .filter(
              (project) =>
                project.areaId === task.areaId && project.archivedAt === null,
            )
            .map((project) => (
              <span key={project._id}>
                {chip(project.name, task.projectId === project._id, {
                  projectId: project._id,
                })}
              </span>
            ))}
        </>
      ),
    },
    {
      id: "day",
      label: "Day",
      empty: !task.date,
      value: dayValue(task.date, today),
      editor: (
        <>
          <DateEditor
            value={task.date}
            today={today}
            label="Pick a day"
            clearLabel="No date"
            clearDisabled={!!repeat}
            change={(value) =>
              void save(
                value
                  ? { date: value }
                  : {
                      date: null,
                      time: null,
                      // Only reminders that count back from the deadline survive without a day.
                      reminders: task.reminders.filter(
                        (reminder) => reminder.type === "deadline",
                      ),
                    },
              )
            }
          />
          {repeat && <p>Turn off repeat before removing the day.</p>}
        </>
      ),
    },
    {
      id: "time",
      label: "Time",
      empty: !task.time,
      value: timeValue(task.time, task.durationMinutes),
      editor: (
        <>
          <input
            id="task-time"
            aria-label={section === "time" ? "Move to" : "Start time"}
            type="time"
            step={900}
            value={task.time ?? ""}
            onChange={(event) =>
              void save({
                time: event.target.value || null,
                date: task.date ?? date,
              })
            }
          />
          {chip("Any time", !task.time, { time: null })}
        </>
      ),
    },
    {
      id: "length",
      label: "Length",
      empty: task.durationMinutes === null,
      value: lengthValue(task.durationMinutes),
      editor: (
        <>
          {chip("None", task.durationMinutes === null, {
            durationMinutes: null,
          })}
          {[
            15,
            30,
            45,
            60,
            90,
            120,
            ...(task.durationMinutes !== null &&
            ![15, 30, 45, 60, 90, 120].includes(task.durationMinutes)
              ? [task.durationMinutes]
              : []),
          ].map((minutes) => (
            <span key={minutes}>
              {chip(formatMinutes(minutes), task.durationMinutes === minutes, {
                durationMinutes: minutes,
              })}
            </span>
          ))}
          <p>
            Optional. Without a length the task shows as a marker at its start
            time.
          </p>
        </>
      ),
    },
    {
      id: "deadline",
      label: "Deadline",
      empty: !task.deadline,
      urgent: deadline.urgent,
      value: deadline.text,
      editor: (
        <DateEditor
          value={task.deadline}
          today={today}
          label="Pick a deadline"
          change={(value) => void save({ deadline: value })}
        />
      ),
    },
    {
      id: "goal",
      label: "Goal",
      empty: !task.goalId,
      value: goals.find((goal) => goal._id === task.goalId)?.title ?? "None",
      editor: (
        <>
          {chip("None", !task.goalId, { goalId: null })}
          {goals
            .filter(
              (goal) =>
                goal.areaId === task.areaId &&
                (goal.status === "active" || goal._id === task.goalId),
            )
            .map((goal) => (
              <span key={goal._id}>
                {chip(goal.title, task.goalId === goal._id, {
                  goalId: goal._id,
                })}
              </span>
            ))}
        </>
      ),
    },
    {
      id: "repeat",
      label: "Repeat",
      empty: !repeat,
      value: repeatText(repeat, task.date),
      editor: (
        <>
          {chip("Does not repeat", !repeat, { repeat: null })}
          {repeatPresets(anchor).map((preset) => (
            <span key={preset.id}>
              {chip(preset.label, sameRule(repeat, preset.rule), {
                date: anchor,
                repeat: preset.rule,
              })}
            </span>
          ))}
          {repeat && (
            <>
              <div className={s.repeatEvery}>
                <label htmlFor="repeat-every">Every</label>
                <input
                  id="repeat-every"
                  aria-label="Repeat interval"
                  type="number"
                  min={1}
                  max={1000}
                  key={repeat.every}
                  defaultValue={repeat.every}
                  onBlur={(event) => {
                    const every = Number(event.target.value);
                    if (Number.isInteger(every) && every >= 1 && every <= 1000)
                      void save({ repeat: { ...repeat, every } });
                    else event.target.value = String(repeat.every);
                  }}
                />
                {(["day", "week", "month", "year"] as const).map((unit) => (
                  <span key={unit}>
                    {chip(
                      repeat.every === 1 ? unit : `${unit}s`,
                      repeat.unit === unit,
                      { repeat: rule({ unit }, ["weekdays", "monthDay"]) },
                    )}
                  </span>
                ))}
              </div>
              {repeat.unit === "week" && (
                <div className={s.opts} aria-label="Repeat weekdays">
                  {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                    const name = weekdayName(addDays("2026-09-27", weekday));
                    const on = repeat.weekdays?.includes(weekday) ?? false;
                    const weekdays = on
                      ? repeat.weekdays?.filter((day) => day !== weekday)
                      : [...(repeat.weekdays ?? []), weekday];
                    return (
                      <button
                        key={weekday}
                        type="button"
                        className={`${s.f} ${on ? s.on : ""}`}
                        aria-label={name}
                        aria-pressed={on}
                        onClick={() =>
                          void save({
                            repeat: weekdays?.length
                              ? rule({ weekdays })
                              : rule({}, ["weekdays"]),
                          })
                        }
                      >
                        {name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}
              {(repeat.unit === "month" || repeat.unit === "year") && (
                <div className={s.opts} aria-label="Day of the month">
                  {monthDayChoices(anchor).map((choice) => (
                    <span key={choice.label}>
                      {chip(
                        choice.label,
                        JSON.stringify(repeat.monthDay) ===
                          JSON.stringify(choice.monthDay),
                        { date: anchor, repeat: rule({ monthDay: choice.monthDay }) },
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div className={s.repeatEvery} role="group" aria-label="Next date from">
                <span>Next date from</span>
                {chip("Its day", repeat.basis !== "completion", {
                  repeat: rule({}, ["basis"]),
                })}
                {chip("When done", repeat.basis === "completion", {
                  repeat: rule({ basis: "completion" }),
                })}
              </div>
              <div className={s.repeatEvery} role="group" aria-label="Ends">
                <span>Ends</span>
                {chip("Never", !repeat.ends, { repeat: rule({}, ["ends"]) })}
                <button
                  type="button"
                  className={`${s.f} ${repeat.ends?.kind === "on" ? s.on : ""}`}
                  aria-pressed={repeat.ends?.kind === "on"}
                  aria-expanded={endPicker}
                  onClick={() => setEndPicker(!endPicker)}
                >
                  On a date
                </button>
                {chip("After a number of times", repeat.ends?.kind === "after", {
                  repeat: rule({
                    ends: {
                      kind: "after",
                      count: repeat.ends?.kind === "after" ? repeat.ends.count : 10,
                    },
                  }),
                })}
              </div>
              {endPicker && (
                <DateEditor
                  value={repeat.ends?.kind === "on" ? repeat.ends.date : null}
                  today={today}
                  label="Last date"
                  clearLabel="Never"
                  change={(value) => {
                    setEndPicker(false);
                    void save({
                      repeat: value
                        ? rule({ ends: { kind: "on", date: value } })
                        : rule({}, ["ends"]),
                    });
                  }}
                />
              )}
              {repeat.ends?.kind === "after" && (
                <div className={s.repeatEvery}>
                  <input
                    aria-label="Number of times"
                    type="number"
                    min={1}
                    max={1000}
                    key={repeat.ends.count}
                    defaultValue={repeat.ends.count}
                    onBlur={(event) => {
                      const count = Number(event.target.value);
                      if (Number.isInteger(count) && count >= 1 && count <= 1000)
                        void save({ repeat: rule({ ends: { kind: "after", count } }) });
                      else if (repeat.ends?.kind === "after")
                        event.target.value = String(repeat.ends.count);
                    }}
                  />
                  <span>times in all</span>
                </div>
              )}
              {skip && task.status === "active" && (
                <button type="button" className={s.f} onClick={() => void skip(task)}>
                  Skip this time
                </button>
              )}
            </>
          )}
        </>
      ),
    },
    {
      id: "reminders",
      label: "Reminders",
      empty: !task.reminders.length,
      value: remindersValue(task.reminders),
      editor: (
        <>
          {task.reminders.map((reminder, index) => (
            <div key={`${reminder.type}-${index}`} className={s.reminderRow}>
              <span>{reminderText(reminder)}</span>
              <button
                type="button"
                className={s.iconButton}
                aria-label={`Remove reminder: ${reminderText(reminder)}`}
                onClick={() =>
                  void save({
                    reminders: task.reminders.filter((_, i) => i !== index),
                  })
                }
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
          {reminderChip("At start", { type: "at_start" }, !task.time)}
          {reminderChip(
            "10 min before",
            { type: "before", minutes: 10 },
            !task.time,
          )}
          {reminderChip(
            "1 hour before",
            { type: "before", minutes: 60 },
            !task.time,
          )}
          {reminderChip("Morning of", { type: "morning_of" }, !task.date)}
          {reminderChip("Day before", { type: "day_before" }, !task.date)}
          {deadlineReminderPresets.map((preset) => (
            <span key={preset.label}>
              {reminderChip(preset.label, preset.reminder, !task.deadline)}
            </span>
          ))}
          <button
            type="button"
            className={s.f}
            aria-expanded={atTime}
            disabled={!task.date}
            onClick={() => setAtTime(!atTime)}
          >
            At a time
          </button>
          {atTime && (
            <>
              <input
                aria-label="Reminder time"
                type="time"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
              />
              <button
                type="button"
                className={s.f}
                disabled={!reminderTime}
                onClick={() =>
                  addReminder({ type: "at_time", time: reminderTime })
                }
              >
                Add reminder
              </button>
            </>
          )}
          <div className={s.repeatEvery} role="group" aria-label="Custom reminder before start">
            <input
              aria-label="How long before"
              type="number"
              min={1}
              value={beforeAmount}
              disabled={!task.time}
              onChange={(event) => setBeforeAmount(event.target.value)}
            />
            {(["min", "hour", "day"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                className={`${s.f} ${beforeUnit === unit ? s.on : ""}`}
                aria-pressed={beforeUnit === unit}
                disabled={!task.time}
                onClick={() => setBeforeUnit(unit)}
              >
                {unit === "min" || amount === 1 ? unit : `${unit}s`}
              </button>
            ))}
            <button
              type="button"
              className={s.f}
              disabled={!task.time || !beforeMinutes}
              onClick={() =>
                beforeMinutes && addReminder({ type: "before", minutes: beforeMinutes })
              }
            >
              Add before start
            </button>
          </div>
          {!task.time && (
            <p>Set a time to use these: At start and before start.</p>
          )}
          {!task.date && !task.deadline && (
            <p>Set a day or a deadline for reminders to have a date.</p>
          )}
          {task.date && !task.deadline && (
            <p>Set a deadline to be reminded before it.</p>
          )}
        </>
      ),
    },
  ];
  return (
    <Dialog
      label="Task details"
      className={s.panel}
      close={close}
      escape={() => (open ? setOpen(null) : close())}
      focusOnTouch={!!section}
      initialFocus={
        section === "time"
          ? "#task-time"
          : section === "length"
            ? '[aria-label="Length editor"] button'
            : 'textarea[aria-label="Task title"]'
      }
    >
      <div
        className={s.panelContent}
        style={{ "--c": areaColor(area) } as Variables}
      >
        <div className={s.ph}>
          <i className={s.dot} />
          {projectName(task, projects, areas)}
          <button
            className={s.iconButton}
            onClick={close}
            aria-label="Close task details"
          >
            <Icon name="close" />
          </button>
        </div>
        {error && (
          <div role="alert" className={s.empty}>
            {error}{" "}
            {failedPatch && (
              <button onClick={() => void save(failedPatch)}>Retry save</button>
            )}
          </div>
        )}
        <div className={s.tt}>
          <Check task={task} toggle={toggle} />
          <AutoTextarea
            defaultValue={task.title}
            aria-label="Task title"
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value && value !== task.title) void save({ title: value });
              if (!value) {
                event.target.value = task.title;
                setError("Task title was empty. Enter a title and try again.");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <AutoTextarea
          className={s.panelNotes}
          aria-label="Notes"
          defaultValue={task.notes}
          placeholder="Add notes"
          onBlur={(event) => {
            if (event.target.value !== task.notes)
              void save({ notes: event.target.value });
          }}
        />
        <PropertyList rows={rows} open={open} setOpen={setOpen} />
        <footer className={s.pf}>
          <span>Added {addedDate(task.createdAt)}</span>
          <button
            className={`${s.btn} ${s.danger}`}
            onClick={() => remove(task)}
          >
            Delete task
          </button>
        </footer>
      </div>
      {toast}
    </Dialog>
  );
}
