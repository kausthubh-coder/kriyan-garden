"use client";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import { useFormAction } from "./useFormAction";
import type { Area, Project } from "./types";
import s from "./App.module.css";
const value = (d: FormData, key: string) => String(d.get(key) ?? "");
function Feedback({ action }: { action: ReturnType<typeof useFormAction> }) {
  return (
    <>
      {action.error && <p role="alert">{action.error}</p>}
      {action.message && <p role="status">{action.message}</p>}
    </>
  );
}
export function AreaSelect({
  areas,
  selected,
  optional = false,
}: {
  areas: Area[];
  selected?: string | null;
  optional?: boolean;
}) {
  return (
    <label>
      Area
      <select
        name="area"
        defaultValue={selected ?? (optional ? "" : areas[0]?._id)}
        required={!optional}
      >
        {optional && <option value="">No area</option>}
        {areas.map((a) => (
          <option value={a._id} key={a._id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function AreasEditor({ areas }: { areas: Area[] }) {
  const create = useMutation(api.areas.create),
    update = useMutation(api.areas.update),
    remove = useMutation(api.areas.remove),
    action = useFormAction();
  return (
    <section className={s.editor}>
      <h2>Areas</h2>
      <fieldset disabled={action.busy}>
        {areas.map((a, i) => (
          <form
            className={s.inlineForm}
            key={a._id}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void action.run(() =>
                update({
                  id: a._id,
                  patch: {
                    name: value(d, "name"),
                    color: value(d, "color") as Area["color"],
                  },
                }),
              );
            }}
          >
            <label>
              Area name
              <input
                name="name"
                required
                maxLength={48}
                defaultValue={a.name}
              />
            </label>
            <label>
              Area colour
              <select name="color" defaultValue={a.color}>
                {(["blue", "orange", "green", "grey"] as const).map((c) => (
                  <option key={c}>{c}</option>
                ))}
                {!["blue", "orange", "green", "grey"].includes(a.color) && (
                  <option>{a.color}</option>
                )}
              </select>
            </label>
            <button className={s.f}>Save area</button>
            <button
              className={s.f}
              type="button"
              disabled={i === 0}
              aria-label={`Move ${a.name} up`}
              onClick={() =>
                void action.run(async () => {
                  const previous = areas[i - 1];
                  if (!previous) return;
                  await update({
                    id: a._id,
                    patch: { sortOrder: previous.sortOrder },
                  });
                  await update({
                    id: previous._id,
                    patch: { sortOrder: a.sortOrder },
                  });
                })
              }
            >
              Move up
            </button>
            <button
              className={s.f}
              type="button"
              disabled={i === areas.length - 1}
              aria-label={`Move ${a.name} down`}
              onClick={() =>
                void action.run(async () => {
                  const next = areas[i + 1];
                  if (!next) return;
                  await update({
                    id: a._id,
                    patch: { sortOrder: next.sortOrder },
                  });
                  await update({
                    id: next._id,
                    patch: { sortOrder: a.sortOrder },
                  });
                })
              }
            >
              Move down
            </button>
            <button
              className={s.f}
              type="button"
              onClick={() => void action.run(() => remove({ id: a._id }))}
            >
              Delete area
            </button>
          </form>
        ))}
        {!areas.length && (
          <p>No areas yet. Add an area to organize your tasks.</p>
        )}
        <form
          className={s.inlineForm}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            if (
              await action.run(() =>
                create({
                  name: value(d, "name"),
                  color: value(d, "color") as Area["color"],
                }),
              )
            )
              form.reset();
          }}
        >
          <label>
            New area name
            <input name="name" required maxLength={48} />
          </label>
          <label>
            New area colour
            <select name="color">
              <option value="grey">Grey</option>
              <option value="blue">Blue</option>
              <option value="orange">Orange</option>
              <option value="green">Green</option>
            </select>
          </label>
          <button className={s.f} disabled={areas.length >= 12}>
            Add area
          </button>
        </form>
      </fieldset>
      <Feedback action={action} />
    </section>
  );
}
export function ProjectsEditor({
  areas,
  projects,
}: {
  areas: Area[];
  projects: Project[];
}) {
  const create = useMutation(api.projects.create),
    update = useMutation(api.projects.update),
    remove = useMutation(api.projects.remove),
    action = useFormAction();
  return (
    <section className={s.editor}>
      <h2>Projects and courses</h2>
      <fieldset disabled={action.busy}>
        {projects.map((p) => (
          <form
            className={s.inlineForm}
            key={p._id}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void action.run(() =>
                update({
                  id: p._id,
                  patch: {
                    name: value(d, "name"),
                    areaId: value(d, "area") as Id<"areas">,
                    kind: value(d, "kind") as Project["kind"],
                  },
                }),
              );
            }}
          >
            <label>
              Name
              <input
                name="name"
                defaultValue={p.name}
                required
                maxLength={120}
              />
            </label>
            <AreaSelect areas={areas} selected={p.areaId} />
            <label>
              Kind
              <select name="kind" defaultValue={p.kind}>
                <option value="project">Project</option>
                <option value="course">Course</option>
              </select>
            </label>
            <button className={s.f}>Save project</button>
            <button
              type="button"
              className={s.f}
              onClick={() => void action.run(() => remove({ id: p._id }))}
            >
              Delete project
            </button>
          </form>
        ))}
        {!projects.length && <p>No projects or courses yet.</p>}
        <form
          className={s.inlineForm}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            if (
              await action.run(() =>
                create({
                  name: value(d, "name"),
                  areaId: value(d, "area") as Id<"areas">,
                  kind: value(d, "kind") as Project["kind"],
                }),
              )
            )
              form.reset();
          }}
        >
          <label>
            New project or course
            <input name="name" required maxLength={120} />
          </label>
          <AreaSelect areas={areas} />
          <label>
            Kind
            <select name="kind">
              <option value="project">Project</option>
              <option value="course">Course</option>
            </select>
          </label>
          <button className={s.f} disabled={!areas.length}>
            Add project
          </button>
        </form>
      </fieldset>
      <Feedback action={action} />
    </section>
  );
}
export function EventsEditor({
  areas,
  events,
  today,
}: {
  areas: Area[];
  events: Doc<"events">[];
  today: string;
}) {
  return (
    <section className={s.editor}>
      <h2>Classes and fixed meetings</h2>
      {!events.length && <p>No classes or fixed meetings yet.</p>}
      {events.map((event) => (
        <EventForm areas={areas} event={event} today={today} key={event._id} />
      ))}
      <EventForm areas={areas} today={today} />
    </section>
  );
}
function EventForm({
  areas,
  event,
  today,
}: {
  areas: Area[];
  event?: Doc<"events">;
  today: string;
}) {
  const create = useMutation(api.events.create),
    update = useMutation(api.events.update),
    remove = useMutation(api.events.remove),
    action = useFormAction();
  return (
    <form
      className={s.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = new FormData(form);
        const fields = {
          title: value(d, "title"),
          areaId: (value(d, "area") || null) as Id<"areas"> | null,
          location: value(d, "location"),
          weekdays: d.getAll("weekday").map(Number),
          startTime: value(d, "start"),
          endTime: value(d, "end"),
          fromDate: value(d, "from"),
          untilDate: value(d, "until") || null,
        };
        if (
          await action.run(() =>
            event ? update({ id: event._id, patch: fields }) : create(fields),
          )
        ) {
          if (!event) form.reset();
        }
      }}
    >
      <fieldset disabled={action.busy}>
        <label>
          {event ? "Meeting title" : "New class or meeting"}
          <input
            name="title"
            required
            defaultValue={event?.title}
            maxLength={180}
          />
        </label>
        <AreaSelect areas={areas} selected={event?.areaId} optional />
        <label>
          Location
          <input name="location" defaultValue={event?.location} />
        </label>
        <fieldset className={s.weekdayChoices}>
          <legend>Weekdays</legend>
          {[
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].map((day, i) => (
            <label key={day}>
              <input
                type="checkbox"
                name="weekday"
                value={i}
                defaultChecked={event?.weekdays.includes(i)}
              />
              {day.slice(0, 3)}
            </label>
          ))}
        </fieldset>
        <div className={s.inlineForm}>
          <label>
            Start time
            <input
              name="start"
              type="time"
              required
              defaultValue={event?.startTime ?? "09:00"}
            />
          </label>
          <label>
            End time
            <input
              name="end"
              type="time"
              required
              defaultValue={event?.endTime ?? "10:00"}
            />
          </label>
        </div>
        <div className={s.inlineForm}>
          <label>
            From date
            <input
              name="from"
              type="date"
              required
              defaultValue={event?.fromDate ?? today}
            />
          </label>
          <label>
            Until date
            <input
              name="until"
              type="date"
              defaultValue={event?.untilDate ?? ""}
            />
          </label>
        </div>
        <div className={s.inlineForm}>
          <button className={s.f}>
            {event ? "Save meeting" : "Add meeting"}
          </button>
          {event && (
            <button
              type="button"
              className={s.f}
              onClick={() => void action.run(() => remove({ id: event._id }))}
            >
              Delete meeting
            </button>
          )}
        </div>
      </fieldset>
      <Feedback action={action} />
    </form>
  );
}
export function HabitsEditor({
  areas,
  habits,
}: {
  areas: Area[];
  habits: Doc<"habits">[];
}) {
  return (
    <section className={s.editor}>
      <h2>Habits</h2>
      {!habits.length && <p>No habits yet.</p>}
      {habits.map((habit) => (
        <HabitForm areas={areas} habit={habit} key={habit._id} />
      ))}
      <HabitForm areas={areas} />
    </section>
  );
}
function HabitForm({ areas, habit }: { areas: Area[]; habit?: Doc<"habits"> }) {
  const create = useMutation(api.habits.create),
    update = useMutation(api.habits.update),
    remove = useMutation(api.habits.remove),
    action = useFormAction();
  return (
    <form
      className={s.inlineForm}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = new FormData(form);
        const fields = {
          title: value(d, "title"),
          areaId: value(d, "area") as Id<"areas">,
          weeklyTarget: Number(d.get("target")),
        };
        if (
          await action.run(() =>
            habit ? update({ id: habit._id, patch: fields }) : create(fields),
          )
        ) {
          if (!habit) form.reset();
        }
      }}
    >
      <fieldset disabled={action.busy} className={s.inlineForm}>
        <label>
          {habit ? "Habit title" : "New habit"}
          <input
            name="title"
            required
            maxLength={180}
            defaultValue={habit?.title}
          />
        </label>
        <AreaSelect areas={areas} selected={habit?.areaId} />
        <label>
          Weekly target
          <input
            name="target"
            type="number"
            min={1}
            max={7}
            required
            defaultValue={habit?.weeklyTarget ?? 3}
          />
        </label>
        <button className={s.f} disabled={!areas.length}>
          {habit ? "Save habit" : "Add habit"}
        </button>
        {habit && (
          <button
            className={s.f}
            type="button"
            onClick={() => void action.run(() => remove({ id: habit._id }))}
          >
            Delete habit
          </button>
        )}
      </fieldset>
      <Feedback action={action} />
    </form>
  );
}
