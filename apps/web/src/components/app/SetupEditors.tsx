"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import {
  countText,
  eventValue,
  namedAreaColors,
  parseTimeInput,
  shortDate,
} from "@kriyan/core";
import { EditableRow } from "./EditableRow";
import { AreaChips } from "./AreaChips";
import { Swatches } from "./Swatches";
import { WeekdayToggles } from "./WeekdayToggles";
import { TimeField } from "./TimeField";
import { DateEditor } from "./DateEditor";
import { Icon } from "./Icon";
import { SaveFeedback, useInlineSave, useSetupDraft } from "./useInlineSave";
import {
  areaColor,
  type Area,
  type Profile,
  type Project,
  type Task,
  type Variables,
} from "./types";
import s from "./Onboarding.module.css";

export function AreasRows({
  areas,
  projects = [],
  tasks = [],
  onboarding = false,
  onNames,
}: {
  areas: Area[];
  projects?: Project[];
  tasks?: Task[];
  onboarding?: boolean;
  onNames?: (id: string, name: string) => void;
}) {
  const create = useMutation(api.areas.create),
    update = useMutation(api.areas.update),
    remove = useMutation(api.areas.remove),
    reorder = useMutation(api.areas.reorder);
  const action = useInlineSave();
  const [open, setOpen] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState(""),
    [adding, setAdding] = useState(false),
    [newName, setNewName] = useState(""),
    [lastError, setLastError] = useState("");
  const moving = useRef<string | null>(null);
  const nextColor =
    (Object.keys(namedAreaColors) as Area["color"][]).find(
      (color) => !areas.some((a) => a.color === color),
    ) ?? "grey";
  function move(id: string, to: number) {
    const from = areas.findIndex((a) => a._id === id);
    if (from < 0 || to < 0 || to >= areas.length || from === to) return;
    const ids = areas.map((a) => a._id),
      [selected] = ids.splice(from, 1);
    if (!selected) return;
    ids.splice(to, 0, selected);
    void action.run(id, () => reorder({ ids }));
  }
  async function add() {
    if (!newName.trim()) {
      setAdding(false);
      return;
    }
    if (
      await action.run("add", () => create({ name: newName, color: nextColor }))
    ) {
      setNewName("");
      setAdding(false);
    }
  }
  function erase(area: Area) {
    if (onboarding && areas.length === 1) {
      setLastError("Keep at least one area.");
      return;
    }
    setLastError("");
    void action.run(area._id, () => remove({ id: area._id }));
  }
  return (
    <div className={s.answers}>
      {areas.map((area, index) => (
        <div
          key={area._id}
          data-area-row={area._id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (moving.current) move(moving.current, index);
            moving.current = null;
          }}
        >
          {onboarding && editing === area._id ? (
            <div className={`${s.row} ${s.editing}`}>
              <i
                className={s.dot}
                style={{ "--c": areaColor(area) } as Variables}
              />
              <input
                autoFocus
                aria-label="Area name"
                value={name}
                maxLength={48}
                onChange={(e) => {
                  setName(e.target.value);
                  onNames?.(area._id, e.target.value);
                }}
                onBlur={() => {
                  setEditing(null);
                  onNames?.(area._id, name.trim() || area.name);
                  if (name.trim() && name.trim() !== area.name)
                    void action.run(area._id, () =>
                      update({ id: area._id, patch: { name } }),
                    );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditing(null);
                    onNames?.(area._id, area.name);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
              <button
                className={s.icon}
                aria-label={`Remove ${area.name}`}
                onClick={() => erase(area)}
              >
                <Icon name="close" />
              </button>
            </div>
          ) : (
            <EditableRow
              title={area.name}
              chevron={!onboarding}
              open={open === area._id}
              toggle={() => {
                if (onboarding) {
                  setEditing(area._id);
                  setName(area.name);
                } else setOpen(open === area._id ? null : area._id);
              }}
              leading={
                <>
                  {!onboarding && (
                    <button
                      type="button"
                      data-grip
                      draggable
                      className={s.icon}
                      aria-label={`Reorder ${area.name}. Use arrow keys to move.`}
                      onDragStart={(e) => {
                        moving.current = area._id;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", area._id);
                      }}
                      onDragEnd={() => {
                        moving.current = null;
                      }}
                      onPointerDown={(e) => {
                        if (e.pointerType !== "mouse") {
                          moving.current = area._id;
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }
                      }}
                      onPointerUp={(e) => {
                        if (e.pointerType === "mouse") return;
                        const target = document
                          .elementFromPoint(e.clientX, e.clientY)
                          ?.closest("[data-area-row]")
                          ?.getAttribute("data-area-row");
                        if (target)
                          move(
                            area._id,
                            areas.findIndex((a) => a._id === target),
                          );
                        moving.current = null;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          move(
                            area._id,
                            index + (e.key === "ArrowDown" ? 1 : -1),
                          );
                        }
                      }}
                    >
                      <svg viewBox="0 0 14 24" aria-hidden="true">
                        {[7, 12, 17].flatMap((y) =>
                          [4, 10].map((x) => (
                            <circle
                              key={`${x}-${y}`}
                              cx={x}
                              cy={y}
                              r="1.2"
                              fill="currentColor"
                            />
                          )),
                        )}
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.dotButton}
                    aria-label={`Change ${area.name} colour`}
                    onClick={() => setOpen(open === area._id ? null : area._id)}
                  >
                    <i
                      className={s.dot}
                      style={{ "--c": areaColor(area) } as Variables}
                    />
                  </button>
                </>
              }
              summary={
                onboarding
                  ? undefined
                  : [
                      countText(
                        projects.filter(
                          (p) =>
                            p.areaId === area._id &&
                            !p.archivedAt &&
                            p.kind === "course",
                        ).length,
                        "course",
                      ),
                      countText(
                        projects.filter(
                          (p) =>
                            p.areaId === area._id &&
                            !p.archivedAt &&
                            p.kind === "project",
                        ).length,
                        "project",
                      ),
                      countText(
                        tasks.filter((t) => t.areaId === area._id).length,
                        "task",
                      ),
                    ]
                      .filter((text) => !text.startsWith("0 "))
                      .join(", ") || "No tasks yet"
              }
              remove={onboarding ? () => erase(area) : undefined}
            >
              {!onboarding && (
                <label className={s.field}>
                  <span className={s.label}>Name</span>
                  <input
                    className={`${s.input} ${s.inputSmall}`}
                    aria-label="Area name"
                    maxLength={48}
                    defaultValue={area.name}
                    onBlur={(e) => {
                      if (e.target.value !== area.name)
                        void action.run(area._id, () =>
                          update({
                            id: area._id,
                            patch: { name: e.target.value },
                          }),
                        );
                    }}
                  />
                </label>
              )}
              <span className={s.label}>Colour</span>
              <Swatches
                value={area.color}
                change={(color) =>
                  action.run(area._id, () =>
                    update({ id: area._id, patch: { color } }),
                  )
                }
              />
              {!onboarding && (
                <div className={s.label}>
                  <button
                    className={s.dangerButton}
                    onClick={() => erase(area)}
                  >
                    Delete area
                  </button>
                </div>
              )}
            </EditableRow>
          )}
          <SaveFeedback state={action.feedback[area._id]} />
        </div>
      ))}
      {adding ? (
        <div className={`${s.row} ${s.editing}`}>
          <i
            className={s.dot}
            style={{ "--c": namedAreaColors[nextColor] } as Variables}
          />
          <input
            autoFocus
            aria-label="New area name"
            placeholder="Area name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => void add()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className={s.addRow}
          data-add-row
          disabled={areas.length >= 12}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" />
          {onboarding ? "Add another area" : "Add an area"}
        </button>
      )}
      {lastError && (
        <p role="alert" className={`${s.feedback} ${s.error}`}>
          {lastError}
        </p>
      )}
      <SaveFeedback state={action.feedback.add} />
    </div>
  );
}

export function ProjectsRows({
  areas,
  projects,
  profile,
  advance,
  preview,
}: {
  areas: Area[];
  projects: Project[];
  profile?: Profile;
  advance?: () => void;
  preview?: (areaId: string, name: string) => void;
}) {
  return (
    <div className={s.answers}>
      {areas.map((area) => (
        <ProjectGroup
          key={area._id}
          area={area}
          areas={areas}
          projects={projects.filter((p) => p.areaId === area._id)}
          profile={profile}
          advance={advance}
          preview={preview}
        />
      ))}
    </div>
  );
}
function ProjectGroup({
  area,
  areas,
  projects,
  profile,
  advance,
  preview,
}: {
  area: Area;
  areas: Area[];
  projects: Project[];
  profile?: Profile;
  advance?: () => void;
  preview?: (areaId: string, name: string) => void;
}) {
  const create = useMutation(api.projects.create),
    update = useMutation(api.projects.update),
    remove = useMutation(api.projects.remove),
    action = useInlineSave();
  const [open, setOpen] = useState<string | null>(null),
    [adding, setAdding] = useState(!!profile);
  const draft = useSetupDraft(
    `project.${area._id}`,
    {
      name: "",
      kind: area.name.toLowerCase() === "school" ? "course" : "project",
    },
    profile,
  );
  const kind = draft.values.kind === "course" ? "course" : "project";
  async function add() {
    if (!draft.values.name?.trim()) {
      advance?.();
      return;
    }
    if (
      await action.run("add", () =>
        create({ areaId: area._id, name: draft.values.name, kind }),
      )
    ) {
      draft.change({ name: "" });
      preview?.(area._id, "");
    }
  }
  return (
    <div>
      <h3 className={s.group}>
        <i className={s.dot} style={{ "--c": areaColor(area) } as Variables} />
        {area.name}
      </h3>
      {projects.map((project) => (
        <div key={project._id}>
          <EditableRow
            title={project.name}
            summary={
              project.archivedAt
                ? "Archived"
                : project.kind === "course"
                  ? "Course"
                  : "Project"
            }
            open={open === project._id}
            toggle={
              profile
                ? undefined
                : () => setOpen(open === project._id ? null : project._id)
            }
            remove={
              profile
                ? () =>
                    void action.run(project._id, () =>
                      remove({ id: project._id }),
                    )
                : undefined
            }
          >
            <label className={s.field}>
              <span className={s.label}>Name</span>
              <input
                className={s.input}
                defaultValue={project.name}
                aria-label="Project name"
                onBlur={(e) => {
                  if (e.target.value !== project.name)
                    void action.run(project._id, () =>
                      update({
                        id: project._id,
                        patch: { name: e.target.value },
                      }),
                    );
                }}
              />
            </label>
            <span className={s.label}>Kind</span>
            <div className={s.chips}>
              {(["project", "course"] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`${s.chip} ${project.kind === k ? s.chipOn : ""}`}
                  aria-pressed={project.kind === k}
                  onClick={() =>
                    void action.run(project._id, () =>
                      update({ id: project._id, patch: { kind: k } }),
                    )
                  }
                >
                  {k === "project" ? "Project" : "Course"}
                </button>
              ))}
            </div>
            <span className={s.label}>Area</span>
            <AreaChips
              areas={areas}
              value={project.areaId}
              change={(areaId) =>
                void action.run(project._id, () =>
                  update({ id: project._id, patch: { areaId } }),
                )
              }
            />
            <div className={s.label}>
              <button
                type="button"
                className={s.textButton}
                onClick={() =>
                  void action.run(project._id, () =>
                    update({
                      id: project._id,
                      patch: {
                        archivedAt: project.archivedAt ? null : Date.now(),
                      },
                    }),
                  )
                }
              >
                {project.archivedAt ? "Restore project" : "Archive project"}
              </button>
              <button
                type="button"
                className={s.dangerButton}
                onClick={() =>
                  void action.run(project._id, () =>
                    remove({ id: project._id }),
                  )
                }
              >
                Delete {project.kind}
              </button>
            </div>
          </EditableRow>
          <SaveFeedback state={action.feedback[project._id]} />
        </div>
      ))}
      {adding ? (
        <form
          className={s.formRow}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input
            className={`${s.input} ${s.inputSmall}`}
            aria-label={`New project or course in ${area.name}`}
            placeholder="Add a project or course"
            value={draft.values.name}
            onChange={(e) => {
              draft.change({ name: e.target.value });
              preview?.(area._id, e.target.value);
            }}
          />
          <button
            type="button"
            className={s.chip}
            aria-label={`Kind for ${area.name}: ${kind}`}
            onClick={() =>
              draft.change({ kind: kind === "course" ? "project" : "course" })
            }
          >
            {kind === "course" ? "Course" : "Project"}
          </button>
          <button
            className={s.quietButton}
            disabled={action.feedback.add?.busy || !draft.values.name?.trim()}
          >
            Add {kind}
          </button>
        </form>
      ) : (
        <button className={s.addRow}
          data-add-row onClick={() => setAdding(true)}>
          <Icon name="plus" />
          Add a project or course
        </button>
      )}
      <SaveFeedback state={action.feedback.add} />
      <SaveFeedback state={draft.feedback} />
    </div>
  );
}

export function eventSummary(event: Doc<"events">) {
  return eventValue(event);
}

export function EventsRows({
  areas,
  events,
  today,
  profile,
  onDraft,
}: {
  areas: Area[];
  events: Doc<"events">[];
  today: string;
  profile?: Profile;
  onDraft?: (draft: Record<string, string>) => void;
}) {
  const remove = useMutation(api.events.remove),
    action = useInlineSave();
  const [open, setOpen] = useState<string | null>(null),
    [adding, setAdding] = useState(!!profile);
  const groups = profile
    ? [{ id: "all", name: "", color: undefined, events }]
    : [
        ...areas.map((a) => ({
          id: a._id,
          name: a.name,
          color: areaColor(a),
          events: events.filter((e) => e.areaId === a._id),
        })),
        {
          id: "none",
          name: "No area",
          color: undefined,
          events: events.filter((e) => !e.areaId),
        },
      ];
  return (
    <div className={s.answers}>
      {groups.map((group) => (
        <div key={group.id}>
          {group.name && group.events.length > 0 && (
            <h3 className={s.group}>
              <i
                className={s.dot}
                style={{ "--c": group.color } as Variables}
              />
              {group.name}
            </h3>
          )}
          {group.events.map((event) => (
            <div key={event._id}>
              <EditableRow
                title={event.title}
                summary={eventSummary(event)}
                leading={
                  profile ? (
                    <i
                      className={s.dot}
                      style={
                        {
                          "--c": areaColor(
                            areas.find((a) => a._id === event.areaId),
                          ),
                        } as Variables
                      }
                    />
                  ) : undefined
                }
                open={open === event._id}
                toggle={
                  profile
                    ? undefined
                    : () => setOpen(open === event._id ? null : event._id)
                }
                remove={
                  profile
                    ? () =>
                        void action.run(event._id, () =>
                          remove({ id: event._id }),
                        )
                    : undefined
                }
              >
                <EventEditor
                  key={event._id}
                  areas={areas}
                  event={event}
                  today={today}
                />
                <button
                  type="button"
                  className={s.dangerButton}
                  onClick={() =>
                    void action.run(event._id, () => remove({ id: event._id }))
                  }
                >
                  Delete meeting
                </button>
              </EditableRow>
              <SaveFeedback state={action.feedback[event._id]} />
            </div>
          ))}
        </div>
      ))}
      {adding ? (
        <>
          <span className={s.label}>
            {events.length ? "Add another" : "Add a class or meeting"}
          </span>
          <EventEditor
            areas={areas}
            today={today}
            profile={profile}
            onDraft={onDraft}
          />
        </>
      ) : (
        <button className={s.addRow}
          data-add-row onClick={() => setAdding(true)}>
          <Icon name="plus" />
          Add a class or meeting
        </button>
      )}
      {!profile && events.length === 0 && !adding && (
        <p className={s.feedback}>No fixed weekly times yet.</p>
      )}
    </div>
  );
}

function EventEditor({
  areas,
  today,
  event,
  profile,
  onDraft,
}: {
  areas: Area[];
  today: string;
  event?: Doc<"events">;
  profile?: Profile;
  onDraft?: (draft: Record<string, string>) => void;
}) {
  const create = useMutation(api.events.create),
    update = useMutation(api.events.update),
    action = useInlineSave();
  const draft = useSetupDraft(
    "event",
    {
      title: event?.title ?? "",
      days: event?.weekdays.join(",") ?? "",
      start: event?.startTime ?? "10:00",
      end: event?.endTime ?? "11:15",
      location: event?.location ?? "",
      area: event?.areaId ?? areas[0]?._id ?? "",
      from: event?.fromDate ?? today,
      until: event?.untilDate ?? "",
    },
    profile,
  );
  const initialDraft = useRef(draft.values);
  useEffect(() => { onDraft?.(initialDraft.current); }, [onDraft]);
  const [error, setError] = useState("");
  function change(patch: Record<string, string>) {
    draft.change(patch);
    onDraft?.({ ...draft.values, ...patch });
    setError("");
  }
  async function save(patch: Record<string, string> = {}) {
    const v = { ...draft.values, ...patch },
      start = parseTimeInput(v.start),
      end = parseTimeInput(v.end);
    if (!start || !end) {
      setError("Enter a start and end time such as 10:15.");
      return;
    }
    if (end <= start) {
      setError("End time must be after the start.");
      return;
    }
    const weekdays = v.days ? v.days.split(",").map(Number) : [];
    if (!weekdays.length) {
      setError("Choose at least one weekday.");
      return;
    }
    if (!v.title.trim()) {
      setError("Enter a name for the class or meeting.");
      return;
    }
    const fields = {
      title: v.title,
      weekdays,
      startTime: start,
      endTime: end,
      location: v.location,
      areaId: v.area ? (v.area as Id<"areas">) : null,
      fromDate: v.from,
      untilDate: v.until || null,
    };
    if (
      await action.run("event", () =>
        event ? update({ id: event._id, patch: fields }) : create(fields),
      )
    ) {
      if (!event) {
        change({ title: "", location: "" });
      }
    }
  }
  function edit(patch: Record<string, string>) {
    change(patch);
    if (event) void save(patch);
  }
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <input
        className={s.input}
        aria-label={event ? "Meeting title" : "New class or meeting"}
        placeholder="Class or meeting name"
        value={draft.values.title}
        maxLength={180}
        onChange={(e) => change({ title: e.target.value })}
        onBlur={() => {
          if (event) void save();
        }}
      />
      <div className={`${s.formRow} ${s.scheduleRow}`}>
        <WeekdayToggles
          value={
            draft.values.days ? draft.values.days.split(",").map(Number) : []
          }
          change={(days) => edit({ days: days.join(",") })}
        />
        <div className={s.range}>
          <TimeField
            label="Start"
            value={draft.values.start}
            change={(start) => change({ start })}
            save={event ? (start) => void save({ start }) : undefined}
            required
          />{" "}
          to{" "}
          <TimeField
            label="End"
            value={draft.values.end}
            change={(end) => change({ end })}
            save={event ? (end) => void save({ end }) : undefined}
            required
          />
        </div>
      </div>
      {error && (
        <p role="alert" className={`${s.feedback} ${s.error}`}>
          {error}
        </p>
      )}
      <div className={s.formRow}>
        <input
          className={`${s.input} ${s.inputSmall}`}
          aria-label="Place, optional"
          placeholder="Place, optional"
          value={draft.values.location}
          onChange={(e) => change({ location: e.target.value })}
          onBlur={() => {
            if (event) void save();
          }}
        />
        <AreaChips
          areas={areas}
          value={draft.values.area}
          change={(area) => edit({ area })}
        />
      </div>
      {!profile && (
        <>
          <div>
            <span className={s.label}>Runs from</span>
            <p className={s.feedback}>{shortDate(draft.values.from)}</p>
            <DateEditor
              value={draft.values.from}
              today={today}
              label="Runs from"
              required
              change={(from) => {
                if (from) edit({ from });
              }}
            />
          </div>
          <div>
            <span className={s.label}>Until</span>
            <p className={s.feedback}>
              {draft.values.until
                ? shortDate(draft.values.until)
                : "No end date"}
            </p>
            <DateEditor
              value={draft.values.until || null}
              today={today}
              label="Until"
              change={(until) => edit({ until: until ?? "" })}
            />
          </div>
        </>
      )}
      {!event && (
        <div>
          <button
            className={s.quietButton}
            disabled={action.feedback.event?.busy}
          >
            <Icon name="plus" />
            Add class
          </button>
        </div>
      )}
      <SaveFeedback state={action.feedback.event} />
      <SaveFeedback state={draft.feedback} />
    </form>
  );
}

export function HabitsRows({
  areas,
  habits,
}: {
  areas: Area[];
  habits: Doc<"habits">[];
}) {
  const create = useMutation(api.habits.create),
    update = useMutation(api.habits.update),
    remove = useMutation(api.habits.remove),
    action = useInlineSave();
  const [open, setOpen] = useState<string | null>(null),
    [adding, setAdding] = useState(false),
    [title, setTitle] = useState(""),
    [area, setArea] = useState(areas[0]?._id),
    [target, setTarget] = useState(5);
  return (
    <div className={s.answers}>
      {habits.map((habit) => (
        <div key={habit._id}>
          <EditableRow
            title={habit.title}
            summary={`${habit.weeklyTarget} of 7 a week`}
            open={open === habit._id}
            toggle={() => setOpen(open === habit._id ? null : habit._id)}
          >
            <label className={s.field}>
              <span className={s.label}>Name</span>
              <input
                className={s.input}
                aria-label="Habit title"
                defaultValue={habit.title}
                onBlur={(e) => {
                  if (e.target.value !== habit.title)
                    void action.run(habit._id, () =>
                      update({
                        id: habit._id,
                        patch: { title: e.target.value },
                      }),
                    );
                }}
              />
            </label>
            <span className={s.label}>Area</span>
            <AreaChips
              areas={areas}
              value={habit.areaId}
              change={(areaId) =>
                void action.run(habit._id, () =>
                  update({ id: habit._id, patch: { areaId } }),
                )
              }
            />
            <span className={s.label}>Weekly target</span>
            <div className={s.chips} role="group" aria-label="Weekly target">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  className={`${s.chip} ${n === habit.weeklyTarget ? s.chipOn : ""}`}
                  aria-pressed={n === habit.weeklyTarget}
                  key={n}
                  onClick={() =>
                    void action.run(habit._id, () =>
                      update({ id: habit._id, patch: { weeklyTarget: n } }),
                    )
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className={s.label}>
              <button
                className={s.dangerButton}
                onClick={() =>
                  void action.run(habit._id, () => remove({ id: habit._id }))
                }
              >
                Delete habit
              </button>
            </div>
          </EditableRow>
          <SaveFeedback state={action.feedback[habit._id]} />
        </div>
      ))}
      {adding ? (
        <form
          className={s.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              area &&
              (await action.run("add", () =>
                create({ title, areaId: area, weeklyTarget: target }),
              ))
            ) {
              setTitle("");
              setAdding(false);
            }
          }}
        >
          <input
            className={s.input}
            aria-label="New habit"
            placeholder="Habit name"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <AreaChips areas={areas} value={area ?? null} change={setArea} />
          <div className={s.chips} role="group" aria-label="Weekly target">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                type="button"
                className={`${s.chip} ${target === n ? s.chipOn : ""}`}
                aria-pressed={target === n}
                key={n}
                onClick={() => setTarget(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className={s.quietButton}
            disabled={!area || action.feedback.add?.busy}
          >
            Add habit
          </button>
        </form>
      ) : (
        <button
          className={s.addRow}
          data-add-row
          disabled={!areas.length}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" />
          Add a habit
        </button>
      )}
      {!habits.length && !adding && (
        <p className={s.feedback}>No habits yet.</p>
      )}
      <SaveFeedback state={action.feedback.add} />
    </div>
  );
}
