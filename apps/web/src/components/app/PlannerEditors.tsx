"use client";
import { namedAreaColors } from "@kriyan/core";
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
function ColorChoices({
  selected,
  label,
}: {
  selected: Area["color"];
  label: string;
}) {
  return (
    <fieldset className={s.colorChoices}>
      <legend>{label}</legend>
      {(Object.entries(namedAreaColors) as [Area["color"], string][]).map(
        ([color, value]) => {
          const name = color[0].toUpperCase() + color.slice(1);
          return (
            <label className={s.colorChoice} key={color} title={name}>
              <input
                type="radio"
                name="color"
                value={color}
                defaultChecked={selected === color}
                aria-label={name}
              />
              <span style={{ background: value }} aria-hidden="true" />
            </label>
          );
        },
      )}
    </fieldset>
  );
}
export function AreasEditor({
  areas,
  compact = false,
}: {
  areas: Area[];
  compact?: boolean;
}) {
  const create = useMutation(api.areas.create),
    update = useMutation(api.areas.update),
    remove = useMutation(api.areas.remove),
    action = useFormAction();
  const addForm = (
    <form noValidate
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
      <ColorChoices selected="grey" label="New area colour" />
      <button className={s.f} disabled={areas.length >= 12}>
        Add area
      </button>
    </form>
  );
  return (
    <section className={s.editor}>
      {!compact && (
        <>
          <h2>Areas</h2>
          <p className={s.quiet}>
            Name and colour the areas you use to organize your tasks and goals.
          </p>
        </>
      )}
      <fieldset disabled={action.busy}>
        {areas.map((a, i) => {
          const form = (
            <form noValidate
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
              <ColorChoices selected={a.color} label="Area colour" />
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
          );
          return compact ? (
            <details className={s.areaDetails} key={a._id}>
              <summary>
                {a.name}
                <span>Edit area</span>
              </summary>
              {form}
            </details>
          ) : (
            form
          );
        })}
        {!areas.length && (
          <p>No areas yet. Add an area to organize your tasks.</p>
        )}
        {compact ? (
          <details className={s.areaDetails}>
            <summary>Add area</summary>
            {addForm}
          </details>
        ) : (
          addForm
        )}
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
      <p className={s.quiet}>
        Group related work under an area as a project or course.
      </p>
      <fieldset disabled={action.busy}>
        {projects.map((p) => (
          <form noValidate
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
        <form noValidate
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
  compact = false,
}: {
  areas: Area[];
  events: Doc<"events">[];
  today: string;
  compact?: boolean;
}) {
  return (
    <section className={s.editor}>
      <h2>Classes and meetings</h2>
      <p className={s.quiet}>
        Add fixed weekly times for classes and meetings.
      </p>
      {!events.length && <p>No classes or fixed meetings yet.</p>}
      {events.map((event) => (
        <EventForm
          areas={areas}
          event={event}
          today={today}
          key={event._id}
          compact={compact}
        />
      ))}
      <EventForm areas={areas} today={today} compact={compact} />
    </section>
  );
}
function EventForm({
  areas,
  event,
  today,
  compact,
}: {
  areas: Area[];
  event?: Doc<"events">;
  today: string;
  compact?: boolean;
}) {
  const create = useMutation(api.events.create),
    update = useMutation(api.events.update),
    remove = useMutation(api.events.remove),
    action = useFormAction();
  const options = (
    <>
      {compact && (
        <AreaSelect areas={areas} selected={event?.areaId} optional />
      )}
      <label>
        Location
        <input name="location" defaultValue={event?.location} />
      </label>
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
    </>
  );
  return (
    <form noValidate
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
        {!compact && (
          <AreaSelect areas={areas} selected={event?.areaId} optional />
        )}
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
        <div className={`${s.inlineForm} ${s.meetingTimes}`}>
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
        {compact ? (
          <details className={s.areaDetails}>
            <summary>More options</summary>
            {options}
          </details>
        ) : (
          options
        )}
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
      <p className={s.quiet}>
        Choose the habits you want to complete each week.
      </p>
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
    <form noValidate
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
