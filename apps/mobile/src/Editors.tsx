import { useImperativeHandle, useState, type Ref } from "react";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import {
  Button,
  Choices,
  Field,
  Header,
  ListRow,
  Surface,
  Dot,
  PrimaryButton,
  QuietButton,
  Sheet,
  Swatches,
  TextButton,
  T,
  s,
  ui,
} from "./ui";
import { countText } from "@kriyan/core";
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
        failure instanceof Error &&
          /^(Choose an area before|Enter a goal title)/.test(failure.message)
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
export function AreasEditor({
  areas,
  projects = [],
  onboarding = false,
  back,
}: {
  areas: Area[];
  projects?: Project[];
  onboarding?: boolean;
  back?: () => void;
}) {
  const create = useMutation(api.areas.create),
    update = useMutation(api.areas.update),
    remove = useMutation(api.areas.remove),
    action = useAction();
  const [selected, setSelected] = useState<Area | null>(null),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(""),
    [color, setColor] = useState<Area["color"]>("grey");
  const edit = (area: Area | null) => {
    setSelected(area);
    setName(area?.name ?? "");
    setColor(area?.color ?? "grey");
    setEditing(true);
  };
  return (
    <View style={s.field}>
      {back && (
        <Header
          title="Areas"
          back={back}
          right={
            <QuietButton
              label="Add area"
              icon="plus"
              showLabel
              onPress={() => edit(null)}
            />
          }
        />
      )}
      {!onboarding && !back && (
        <View style={{ alignItems: "flex-end" }}>
          <QuietButton label="Add area" onPress={() => edit(null)} />
        </View>
      )}
      {!areas.length && <T quiet>No areas yet. Add an area to plan tasks.</T>}
      {areas.map((area) => {
        const entries = projects.filter(
            (project) => project.areaId === area._id && !project.archivedAt,
          ),
          courses = entries.filter(
            (project) => project.kind === "course",
          ).length;
        return onboarding ? (
          <View key={area._id} style={[s.heading, { borderBottomWidth: 1, borderColor: ui.colors.line }]}>
            <Surface label={area.name} onPress={() => edit(area)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: ui.spacing[2], minHeight: ui.control.row }}>
              <Dot color={areaColor(area)} large />
              <T style={{ fontFamily: "Schibsted500" }}>{area.name}</T>
            </Surface>
            <TextButton
              label={`Remove ${area.name}`}
              icon="close"
              disabled={action.busy}
              onPress={() => void action.run(() => remove({ id: area._id }))}
            />
          </View>
        ) : (
          <ListRow
            key={area._id}
            label={area.name}
            color={areaColor(area)}
            value={
              courses
                ? countText(courses, "course")
                : countText(entries.length, "project")
            }
            onPress={() => edit(area)}
          />
        );
      })}
      {onboarding && (
        <TextButton
          label="Add another area"
          icon="plus"
          showLabel
          style={{ alignItems: "flex-start" }}
          onPress={() => edit(null)}
        />
      )}
      <Result action={action} />
      {editing && (
        <Sheet
          title={selected ? "Edit area" : "Add area"}
          close={() => {
            if (!action.busy) setEditing(false);
          }}
        >
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            editable={!action.busy}
          />
          <T quiet>Colour</T>
          <Swatches value={color} change={setColor} disabled={action.busy} />
          <View style={[s.heading, { marginTop: ui.spacing[4] }]}>
            {selected && (
              <TextButton
                label="Delete area"
                danger
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await remove({ id: selected._id });
                    setEditing(false);
                  })
                }
              />
            )}
            <PrimaryButton
              label="Save area"
              disabled={action.busy || !name.trim()}
              onPress={() =>
                void action.run(async () => {
                  if (selected)
                    await update({ id: selected._id, patch: { name, color } });
                  else await create({ name, color });
                  setEditing(false);
                })
              }
            />
          </View>
          <Result action={action} />
        </Sheet>
      )}
    </View>
  );
}
export function ProjectsEditor({
  areas,
  projects,
  onboarding = false,
}: {
  areas: Area[];
  projects: Project[];
  onboarding?: boolean;
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
        primary={!onboarding}
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
  onboarding = false,
}: {
  areas: Area[];
  events: Event[];
  today: string;
  onboarding?: boolean;
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
        primary={!onboarding}
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
export type GoalFormHandle = { save: () => Promise<boolean> };
export function GoalForm({
  areas,
  today,
  saved,
  onboarding = false,
  formRef,
}: {
  areas: Area[];
  today: string;
  saved?: () => void;
  onboarding?: boolean;
  formRef?: Ref<GoalFormHandle>;
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
  const saveGoal = () =>
    action.run(async () => {
      if (!title.trim()) throw new Error("Enter a goal title, then continue.");
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
    });
  useImperativeHandle(formRef, () => ({ save: saveGoal }));
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
      {!onboarding && (
        <Button
          label="Add goal"
          primary
          disabled={action.busy || !title.trim()}
          onPress={() => void saveGoal()}
        />
      )}
      <Result action={action} />
    </View>
  );
}
