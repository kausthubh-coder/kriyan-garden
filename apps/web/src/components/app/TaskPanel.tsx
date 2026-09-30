"use client";
import { useState, type ReactNode } from "react";
import { addDays, formatMinutes, minutesOf, timeOf } from "@kriyan/core";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Check } from "./Check";
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
type ReminderKind = Reminder["type"];
const reminderLabels: Record<ReminderKind, string> = {
  at_start: "At start",
  before: "Before start",
  morning_of: "Morning of",
  day_before: "Day before",
  at_time: "At a time",
};
function reminderLabel(reminder: Reminder) {
  return reminder.type === "before"
    ? `${reminder.minutes}m before start`
    : reminder.type === "at_time"
      ? `At ${reminder.time}`
      : reminderLabels[reminder.type];
}
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
  toast?: ReactNode;
}) {
  const [error, setError] = useState(""),
    [failedPatch, setFailedPatch] = useState<TaskPatch | null>(null);
  const [reminderKind, setReminderKind] = useState<ReminderKind>("morning_of"),
    [before, setBefore] = useState(15),
    [reminderTime, setReminderTime] = useState("09:00");
  const save = async (patch: TaskPatch) => {
    setError("");
    setFailedPatch(null);
    try {
      await update(task, patch);
    } catch (failure) {
      setFailedPatch(patch);
      setError(
        failure instanceof Error
          ? failure.message
          : "Task could not be saved. Try saving it again.",
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
  const repeat = task.repeat;
  const repeatKind = !repeat
    ? "none"
    : repeat.every !== 1
      ? "custom"
      : repeat.unit;
  const setRepeat = (unit: string) => {
    if (unit === "none") void save({ repeat: null });
    else if (
      unit === "day" ||
      unit === "week" ||
      unit === "month" ||
      unit === "year"
    )
      void save({ date: task.date ?? date, repeat: { unit, every: 1 } });
    else
      void save({
        date: task.date ?? date,
        repeat: { unit: repeat?.unit ?? "day", every: 2 },
      });
  };
  const addReminder = () => {
    const reminder: Reminder =
      reminderKind === "before"
        ? { type: "before", minutes: before }
        : reminderKind === "at_time"
          ? { type: "at_time", time: reminderTime }
          : { type: reminderKind };
    if (
      !task.reminders.some(
        (current) => JSON.stringify(current) === JSON.stringify(reminder),
      )
    )
      void save({ reminders: [...task.reminders, reminder] });
  };
  return (
    <Dialog
      label="Task details"
      className={s.panel}
      close={close}
      initialFocus={
        section === "time"
          ? "#task-time"
          : section === "length"
            ? "#task-length button"
            : undefined
      }
    >
      <div className={s.ph}>
        <i
          className={s.dot}
          style={
            {
              "--c": areaColor(areas.find((area) => area._id === task.areaId)),
            } as Variables
          }
        />
        {projectName(task, projects, areas)}
        <button onClick={close} aria-label="Close task details">
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
      <div
        className={s.tt}
        style={
          {
            "--c": areaColor(areas.find((area) => area._id === task.areaId)),
          } as Variables
        }
      >
        <Check task={task} toggle={toggle} />
        <textarea
          defaultValue={task.title}
          rows={1}
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
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className={s.fld}>
        <label>Area</label>
        <div className={s.opts}>
          {areas.map((area) => (
            <button
              key={area._id}
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
                })
              }
            >
              <i className={s.dot} />
              {area.name}
            </button>
          ))}
        </div>
      </div>
      <div className={s.fld}>
        <label htmlFor="task-project">Project or course</label>
        <select
          id="task-project"
          value={task.projectId ?? ""}
          onChange={(event) =>
            void save({
              projectId:
                projects.find((project) => project._id === event.target.value)
                  ?._id ?? null,
            })
          }
        >
          <option value="">None</option>
          {projects
            .filter(
              (project) =>
                project.areaId === task.areaId && project.archivedAt === null,
            )
            .map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
        </select>
      </div>
      <div className={s.fld}>
        <label>Day</label>
        <div className={s.opts}>
          {chip("Today", task.date === today, { date: today })}
          {chip("Tomorrow", task.date === addDays(today, 1), {
            date: addDays(today, 1),
          })}
          {chip(
            "No date",
            task.date === null,
            { date: null, time: null },
            !!repeat,
          )}
          <input
            aria-label="Pick a day"
            type="date"
            value={task.date ?? ""}
            onChange={(event) =>
              void save({ date: event.target.value || null })
            }
          />
        </div>
        {repeat && <p>Turn off repeat before removing the day.</p>}
      </div>
      <div className={s.fld}>
        <label htmlFor="task-time">Time</label>
        <div className={s.opts}>
          {chip("Any time", task.time === null, { time: null })}
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
        </div>
      </div>
      <div className={s.fld} id="task-length">
        <label>Length</label>
        <div className={s.opts}>
          {chip("None", task.durationMinutes === null, {
            durationMinutes: null,
          })}
          {[15, 30, 45, 60, 90, 120].map((minutes) => (
            <span key={minutes}>
              {chip(formatMinutes(minutes), task.durationMinutes === minutes, {
                durationMinutes: minutes,
              })}
            </span>
          ))}
          {task.durationMinutes !== null &&
            ![15, 30, 45, 60, 90, 120].includes(task.durationMinutes) &&
            chip(formatMinutes(task.durationMinutes), true, {
              durationMinutes: task.durationMinutes,
            })}
        </div>
        <p>
          {task.durationMinutes === null
            ? "Optional. Without a length this shows as a marker at its start time."
            : task.time
              ? `Runs from ${task.time} to ${timeOf(minutesOf(task.time) + task.durationMinutes)}.`
              : "Counts toward the day's planned hours."}
        </p>
      </div>
      <div className={s.fld}>
        <label htmlFor="task-deadline">Deadline</label>
        <input
          id="task-deadline"
          type="date"
          value={task.deadline ?? ""}
          onChange={(event) =>
            void save({ deadline: event.target.value || null })
          }
        />
      </div>
      <div className={s.fld}>
        <label htmlFor="task-goal">Goal</label>
        <select
          id="task-goal"
          value={task.goalId ?? ""}
          onChange={(event) =>
            void save({
              goalId:
                goals.find((goal) => goal._id === event.target.value)?._id ??
                null,
            })
          }
        >
          <option value="">None</option>
          {goals
            .filter(
              (goal) => goal.status === "active" || goal._id === task.goalId,
            )
            .map((goal) => (
              <option key={goal._id} value={goal._id}>
                {goal.title}
              </option>
            ))}
        </select>
      </div>
      <div className={s.fld}>
        <label htmlFor="task-notes">Notes</label>
        <textarea
          id="task-notes"
          defaultValue={task.notes}
          placeholder="Add notes"
          onBlur={(event) => {
            if (event.target.value !== task.notes)
              void save({ notes: event.target.value });
          }}
        />
        <p>Saved when you leave this field.</p>
      </div>
      <div className={s.fld}>
        <label htmlFor="task-repeat">Repeat</label>
        <select
          id="task-repeat"
          value={repeatKind}
          onChange={(event) => setRepeat(event.target.value)}
        >
          <option value="none">None</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
          <option value="custom">Every N</option>
        </select>
        {repeat && (
          <div className={s.opts}>
            <label htmlFor="repeat-every">Every</label>
            <input
              id="repeat-every"
              aria-label="Repeat interval"
              type="number"
              min={1}
              max={1000}
              defaultValue={repeat.every}
              key={repeat.every}
              onBlur={(event) => {
                const every = Number(event.target.value);
                if (Number.isInteger(every) && every >= 1 && every <= 1000)
                  void save({ repeat: { ...repeat, every } });
                else event.target.value = String(repeat.every);
              }}
            />
            <select
              aria-label="Repeat unit"
              value={repeat.unit}
              onChange={(event) => {
                const unit = event.target.value;
                if (
                  unit === "day" ||
                  unit === "week" ||
                  unit === "month" ||
                  unit === "year"
                )
                  void save({ repeat: { every: repeat.every, unit } });
              }}
            >
              <option value="day">Days</option>
              <option value="week">Weeks</option>
              <option value="month">Months</option>
              <option value="year">Years</option>
            </select>
          </div>
        )}
        {repeat?.unit === "week" && (
          <div className={s.opts} aria-label="Repeat weekdays">
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((label, weekday) => (
              <button
                key={label}
                className={`${s.f} ${repeat.weekdays?.includes(weekday) ? s.on : ""}`}
                aria-label={label}
                aria-pressed={repeat.weekdays?.includes(weekday) ?? false}
                onClick={() => {
                  const weekdays = repeat.weekdays?.includes(weekday)
                    ? repeat.weekdays.filter((day) => day !== weekday)
                    : [...(repeat.weekdays ?? []), weekday];
                  void save({
                    repeat: {
                      every: repeat.every,
                      unit: "week",
                      ...(weekdays.length ? { weekdays } : {}),
                    },
                  });
                }}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={s.fld}>
        <label htmlFor="reminder-kind">Reminders</label>
        <div className={s.opts}>
          <select
            id="reminder-kind"
            value={reminderKind}
            onChange={(event) =>
              setReminderKind(event.target.value as ReminderKind)
            }
          >
            {(Object.entries(reminderLabels) as [ReminderKind, string][]).map(
              ([kind, label]) => (
                <option
                  key={kind}
                  value={kind}
                  disabled={
                    !task.time && (kind === "at_start" || kind === "before")
                  }
                >
                  {label}
                </option>
              ),
            )}
          </select>
          {reminderKind === "before" && (
            <input
              aria-label="Minutes before start"
              type="number"
              min={1}
              value={before}
              onChange={(event) =>
                setBefore(Math.max(1, Number(event.target.value)))
              }
            />
          )}
          {reminderKind === "at_time" && (
            <input
              aria-label="Reminder time"
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
            />
          )}
          <button
            className={s.f}
            disabled={
              (!task.time &&
                (reminderKind === "before" || reminderKind === "at_start")) ||
              (reminderKind === "at_time" && !reminderTime)
            }
            onClick={addReminder}
          >
            Add reminder
          </button>
        </div>
        {!task.time && (
          <p>
            At start and Before start need a task time. Set a time to use them.
          </p>
        )}
        {!task.date && <p>Set a day for reminders to have a date.</p>}
        {task.reminders.map((reminder, index) => (
          <div className={s.opts} key={`${reminder.type}-${index}`}>
            <span>{reminderLabel(reminder)}</span>
            <button
              className={s.f}
              aria-label={`Remove reminder: ${reminderLabel(reminder)}`}
              onClick={() =>
                void save({
                  reminders: task.reminders.filter((_, i) => i !== index),
                })
              }
            >
              Remove reminder
            </button>
          </div>
        ))}
      </div>
      <footer className={s.pf}>
        <button className={`${s.btn} ${s.danger}`} onClick={() => remove(task)}>
          Delete task
        </button>
        <button className={`${s.btn} ${s.ghosty}`} onClick={close}>
          Done
        </button>
      </footer>
      {toast}
    </Dialog>
  );
}
