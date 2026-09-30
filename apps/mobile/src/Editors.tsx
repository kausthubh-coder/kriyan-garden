import { useState } from "react";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { Button, Choices, Field, T, s } from "./ui";
import { DateField } from "./DateField";
import { areaColor, type Area, type Project, type Event } from "./types";
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const run = async (fn: () => Promise<unknown>, success = "Saved.") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message.startsWith("Choose an area before")
          ? failure.message
          : "The change could not be saved. Check the fields and your connection, then try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, message, run };
}
function Result({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      {action.error && <T accessibilityRole="alert">{action.error}</T>}
      {action.message && (
        <T accessibilityLiveRegion="polite" quiet>
          {action.message}
        </T>
      )}
    </>
  );
}
export function AreasEditor({ areas }: { areas: Area[] }) {
  const create = useMutation(api.areas.create),
    update = useMutation(api.areas.update),
    remove = useMutation(api.areas.remove),
    action = useAction();
  const [selected, setSelected] = useState<Area | null>(null),
    [name, setName] = useState(""),
    [color, setColor] = useState<Area["color"]>("grey");
  const clear = () => {
    setSelected(null);
    setName("");
    setColor("grey");
  };
  return (
    <View style={s.field}>
      <T style={s.subtitle}>Areas</T>
      {areas.length === 0 && (
        <T quiet>No areas yet. Add an area to plan tasks.</T>
      )}
      {areas.map((area) => (
        <Button
          key={area._id}
          label={`Edit ${area.name}`}
          color={areaColor(area)}
          onPress={() => {
            setSelected(area);
            setName(area.name);
            setColor(area.color);
          }}
        />
      ))}
      <Field label="Area name" value={name} onChangeText={setName} />
      <Choices
        label="Area colour"
        value={color}
        choices={[
          {
            value: "blue",
            label: "School blue",
            color: areaColor({ color: "blue" }),
          },
          {
            value: "orange",
            label: "Business orange",
            color: areaColor({ color: "orange" }),
          },
          {
            value: "green",
            label: "Life green",
            color: areaColor({ color: "green" }),
          },
          { value: "grey", label: "Neutral" },
        ]}
        change={setColor}
      />
      <Button
        label={selected ? "Save area" : "Add area"}
        primary
        disabled={action.busy || !name.trim()}
        onPress={() =>
          void action.run(async () => {
            if (selected)
              await update({ id: selected._id, patch: { name, color } });
            else await create({ name, color });
            clear();
          })
        }
      />
      {selected && (
        <>
          <Button
            label="Delete area"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await remove({ id: selected._id });
                clear();
              })
            }
          />
          <Button label="Cancel edit" onPress={clear} />
        </>
      )}
      <Result action={action} />
    </View>
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
    action = useAction();
  const [selected, setSelected] = useState<Project | null>(null),
    [name, setName] = useState(""),
    [areaId, setAreaId] = useState(areas[0]?._id ?? ""),
    [kind, setKind] = useState<"project" | "course">("project"),
    [note, setNote] = useState("");
  const clear = () => {
    setSelected(null);
    setName("");
    setNote("");
  };
  return (
    <View style={s.field}>
      <T style={s.subtitle}>Projects and courses</T>
      {projects.length === 0 && (
        <T quiet>No projects or courses yet. Add one when you need it.</T>
      )}
      {projects.map((project) => (
        <Button
          key={project._id}
          label={`Edit ${project.name}${project.archivedAt ? ", archived" : ""}`}
          onPress={() => {
            setSelected(project);
            setName(project.name);
            setAreaId(project.areaId);
            setKind(project.kind);
            setNote(project.note);
          }}
        />
      ))}
      <Field
        label="Project or course name"
        value={name}
        onChangeText={setName}
      />
      <Choices
        label="Area"
        value={areaId}
        choices={areas.map((a) => ({
          value: a._id,
          label: a.name,
          color: areaColor(a),
        }))}
        change={setAreaId}
      />
      <Choices
        label="Kind"
        value={kind}
        choices={[
          { value: "project", label: "Project" },
          { value: "course", label: "Course" },
        ]}
        change={setKind}
      />
      <Field
        label="Project notes"
        value={note}
        onChangeText={setNote}
        multiline
      />
      <Button
        label={selected ? "Save project" : "Add project"}
        primary
        disabled={action.busy || !name.trim()}
        onPress={() =>
          void action.run(async () => {
            const area = areas.find((a) => a._id === areaId);
            if (!area)
              throw new Error("Choose an area before saving the project.");
            if (selected)
              await update({
                id: selected._id,
                patch: { name, areaId: area._id, kind, note },
              });
            else await create({ name, areaId: area._id, kind, note });
            clear();
          })
        }
      />
      {selected && (
        <>
          <Button
            label={selected.archivedAt ? "Restore project" : "Archive project"}
            onPress={() =>
              void action.run(async () => {
                await update({
                  id: selected._id,
                  patch: {
                    archivedAt: selected.archivedAt ? null : Date.now(),
                  },
                });
                clear();
              })
            }
          />
          <Button
            label="Delete project"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await remove({ id: selected._id });
                clear();
              })
            }
          />
          <Button label="Cancel edit" onPress={clear} />
        </>
      )}
      <Result action={action} />
    </View>
  );
}
export function EventsEditor({
  areas,
  events,
  today,
}: {
  areas: Area[];
  events: Event[];
  today: string;
}) {
  const create = useMutation(api.events.create),
    update = useMutation(api.events.update),
    remove = useMutation(api.events.remove),
    action = useAction();
  const [selected, setSelected] = useState<Event | null>(null),
    [title, setTitle] = useState(""),
    [location, setLocation] = useState(""),
    [areaId, setAreaId] = useState<string>(areas[0]?._id ?? "none"),
    [weekdays, setWeekdays] = useState<number[]>([]),
    [startTime, setStartTime] = useState("09:00"),
    [endTime, setEndTime] = useState("10:00"),
    [fromDate, setFromDate] = useState(today),
    [untilDate, setUntilDate] = useState<string | null>(null);
  const clear = () => {
    setSelected(null);
    setTitle("");
    setLocation("");
  };
  return (
    <View style={s.field}>
      <T style={s.subtitle}>Classes and fixed meetings</T>
      {!events.length && (
        <T quiet>
          No fixed meetings yet. Add a class or meeting to see it on your
          timeline.
        </T>
      )}
      {events.map((event) => (
        <Button
          key={event._id}
          label={`Edit ${event.title}`}
          onPress={() => {
            setSelected(event);
            setTitle(event.title);
            setLocation(event.location);
            setAreaId(event.areaId ?? "none");
            setWeekdays(event.weekdays);
            setStartTime(event.startTime);
            setEndTime(event.endTime);
            setFromDate(event.fromDate);
            setUntilDate(event.untilDate);
          }}
        />
      ))}
      <Field
        label="Class or meeting title"
        value={title}
        onChangeText={setTitle}
      />
      <Field label="Location" value={location} onChangeText={setLocation} />
      <Choices
        label="Area"
        value={areaId}
        choices={[
          { value: "none", label: "None" },
          ...areas.map((a) => ({ value: a._id, label: a.name })),
        ]}
        change={setAreaId}
      />
      <T quiet>Weekdays</T>
      <View style={s.wrap}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, day) => (
          <Button
            key={label}
            label={label}
            selected={weekdays.includes(day)}
            onPress={() =>
              setWeekdays(
                weekdays.includes(day)
                  ? weekdays.filter((d) => d !== day)
                  : [...weekdays, day],
              )
            }
          />
        ))}
      </View>
      <DateField
        label="Class start time"
        value={startTime}
        mode="time"
        change={setStartTime}
      />
      <DateField
        label="Class end time"
        value={endTime}
        mode="time"
        change={setEndTime}
      />
      <DateField label="Term starts" value={fromDate} change={setFromDate} />
      <DateField label="Term ends" value={untilDate} change={setUntilDate} />
      <Button
        label="Remove term end"
        onPress={() => setUntilDate(null)}
        disabled={!untilDate}
      />
      <Button
        label={selected ? "Save class" : "Add class"}
        primary
        disabled={action.busy || !title.trim() || !weekdays.length}
        onPress={() =>
          void action.run(async () => {
            const fields = {
              title,
              location,
              areaId: areas.find((a) => a._id === areaId)?._id ?? null,
              weekdays,
              startTime,
              endTime,
              fromDate,
              untilDate,
            };
            if (selected) await update({ id: selected._id, patch: fields });
            else await create(fields);
            clear();
          })
        }
      />
      {selected && (
        <>
          <Button
            label="Delete class"
            onPress={() =>
              void action.run(async () => {
                await remove({ id: selected._id });
                clear();
              })
            }
          />
          <Button label="Cancel edit" onPress={clear} />
        </>
      )}
      <Result action={action} />
    </View>
  );
}
export function GoalForm({
  areas,
  today,
  saved,
}: {
  areas: Area[];
  today: string;
  saved?: () => void;
}) {
  const create = useMutation(api.goals.create),
    action = useAction();
  const [title, setTitle] = useState(""),
    [areaId, setAreaId] = useState(areas[0]?._id ?? ""),
    [targetDate, setTargetDate] = useState<string | null>(null),
    [kind, setKind] = useState<"tasks" | "number" | "milestones">("tasks"),
    [target, setTarget] = useState("10"),
    [unit, setUnit] = useState(""),
    [note, setNote] = useState("");
  return (
    <View style={s.field}>
      <Field label="Goal title" value={title} onChangeText={setTitle} />
      <Choices
        label="Area"
        value={areaId}
        choices={areas.map((a) => ({
          value: a._id,
          label: a.name,
          color: areaColor(a),
        }))}
        change={setAreaId}
      />
      <DateField
        label="Target date"
        value={targetDate}
        change={setTargetDate}
      />
      <Button
        label="Remove target date"
        onPress={() => setTargetDate(null)}
        disabled={!targetDate}
      />
      <Choices
        label="Measure progress"
        value={kind}
        choices={[
          { value: "tasks", label: "Tasks" },
          { value: "number", label: "Number" },
          { value: "milestones", label: "Milestones" },
        ]}
        change={setKind}
      />
      {kind === "number" && (
        <>
          <Field
            label="Target number"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
          />
          <Field label="Unit" value={unit} onChangeText={setUnit} />
        </>
      )}
      <Field label="Goal notes" value={note} onChangeText={setNote} multiline />
      <Button
        label="Add goal"
        primary
        disabled={action.busy || !title.trim()}
        onPress={() =>
          void action.run(async () => {
            const area = areas.find((a) => a._id === areaId);
            if (!area) throw new Error("Choose an area before adding a goal.");
            const metric =
              kind === "number"
                ? { kind, target: Number(target), unit, current: 0 }
                : { kind };
            await create({
              title,
              areaId: area._id,
              startDate: today,
              targetDate,
              metric,
              note,
            });
            setTitle("");
            saved?.();
          })
        }
      />
      <Result action={action} />
    </View>
  );
}
