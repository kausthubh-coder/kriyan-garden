import { useState } from "react";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { goalProgress } from "@kriyan/core";
import { Button, Choices, Field, Sheet, Surface, T, s } from "./ui";
import { GoalForm, useAction } from "./Editors";
import { DateField } from "./DateField";
import { areaColor, type Area, type Goal, type Task } from "./types";
import { theme } from "./theme";
export function Goals({
  goals,
  areas,
  today,
  tasks,
  openTask,
}: {
  goals: Goal[];
  areas: Area[];
  today: string;
  tasks: Task[];
  openTask: (task: Task) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [adding, setAdding] = useState(false);
  const goal = goals.find((g) => g._id === selected);
  return (
    <View style={s.field}>
      <Button label="Add goal" primary onPress={() => setAdding(true)} />
      {!goals.length && (
        <T quiet>No goals yet. Add a goal to track what matters.</T>
      )}
      {goals.map((goal) => {
        const progress = goalProgress(goal, today),
          color = areaColor(areas.find((a) => a._id === goal.areaId));
        return (
          <Surface
            key={goal._id}
            label={`Open goal ${goal.title}`}
            onPress={() => setSelected(goal._id)}
            style={s.card}
          >
            <T style={s.subtitle}>{goal.title}</T>
            <T quiet>
              {areas.find((a) => a._id === goal.areaId)?.name}
              {goal.targetDate
                ? `, due ${goal.targetDate}`
                : ", no target date"}
            </T>
            <View
              style={{
                height: theme.spacing[1],
                backgroundColor: theme.colors.s3,
                borderRadius: theme.radii[0],
                marginVertical: theme.spacing[2],
              }}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(progress.progress * 100),
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progress.progress * 100}%`,
                  backgroundColor: color,
                  borderRadius: theme.radii[0],
                }}
              />
              {progress.expected !== null && (
                <View
                  style={{
                    position: "absolute",
                    left: `${progress.expected * 100}%`,
                    top: -4,
                    height: 16,
                    borderLeftWidth: 2,
                    borderColor: theme.colors.ink,
                  }}
                />
              )}
            </View>
            <T>
              {Math.round(progress.progress * 100)}%,{" "}
              {goal.status === "active"
                ? progress.status
                : goal.status === "done"
                  ? "Done"
                  : "Archived"}
            </T>
            {goal.milestones.slice(0, 3).map((m) => (
              <T key={m._id} quiet>
                {m.title}
                {m.doneAt ? ", done" : ""}
              </T>
            ))}
          </Surface>
        );
      })}
      {adding && (
        <Sheet title="Add goal" close={() => setAdding(false)}>
          <GoalForm
            areas={areas}
            today={today}
            saved={() => setAdding(false)}
          />
        </Sheet>
      )}
      {goal && (
        <GoalDetail
          key={goal._id}
          goal={goal}
          areas={areas}
          tasks={tasks}
          openTask={openTask}
          close={() => setSelected(null)}
        />
      )}
    </View>
  );
}
function GoalDetail({
  goal,
  areas,
  tasks,
  openTask,
  close,
}: {
  goal: Goal;
  areas: Area[];
  tasks: Task[];
  openTask: (task: Task) => void;
  close: () => void;
}) {
  const update = useMutation(api.goals.update),
    createMilestone = useMutation(api.goals.createMilestone),
    updateMilestone = useMutation(api.goals.updateMilestone),
    removeMilestone = useMutation(api.goals.removeMilestone),
    action = useAction();
  const [title, setTitle] = useState(goal.title),
    [note, setNote] = useState(goal.note),
    [targetDate, setTargetDate] = useState(goal.targetDate),
    [areaId, setAreaId] = useState(goal.areaId),
    [current, setCurrent] = useState(
      goal.metric.kind === "number" ? String(goal.metric.current) : "",
    ),
    [milestone, setMilestone] = useState("");
  return (
    <Sheet title="Goal details" close={close}>
      <Field label="Goal title" value={title} onChangeText={setTitle} />
      <Choices
        label="Area"
        value={areaId}
        choices={areas.map((a) => ({ value: a._id, label: a.name }))}
        change={setAreaId}
      />
      <DateField
        label="Target date"
        value={targetDate}
        change={setTargetDate}
      />
      <Button
        label="Remove target date"
        disabled={!targetDate}
        onPress={() => setTargetDate(null)}
      />
      <Field label="Goal notes" value={note} onChangeText={setNote} multiline />
      {goal.metric.kind === "number" && (
        <Field
          label={`Current progress in ${goal.metric.unit}`}
          value={current}
          onChangeText={setCurrent}
          keyboardType="decimal-pad"
        />
      )}
      <Button
        label="Save goal"
        primary
        disabled={action.busy}
        onPress={() =>
          void action.run(() =>
            update({
              id: goal._id,
              patch: {
                title,
                note,
                targetDate,
                areaId,
                ...(goal.metric.kind === "number"
                  ? { metric: { ...goal.metric, current: Number(current) } }
                  : {}),
              },
            }),
          )
        }
      />
      <Choices
        label="Goal status"
        value={goal.status}
        choices={[
          { value: "active", label: "Active" },
          { value: "done", label: "Done" },
          { value: "archived", label: "Archived" },
        ]}
        change={(status) =>
          void action.run(() => update({ id: goal._id, patch: { status } }))
        }
      />
      <T style={s.subtitle}>Milestones</T>
      {!goal.milestones.length && (
        <T quiet>No milestones yet. Add the next step.</T>
      )}
      {goal.milestones.map((m) => (
        <View key={m._id} style={s.field}>
          <T>
            {m.title}
            {m.doneAt ? ", done" : ""}
          </T>
          <View style={s.wrap}>
            <Button
              label={m.doneAt ? "Reopen milestone" : "Complete milestone"}
              onPress={() =>
                void action.run(() =>
                  updateMilestone({
                    id: m._id,
                    patch: { doneAt: m.doneAt ? null : Date.now() },
                  }),
                )
              }
            />
            <Button
              label="Delete milestone"
              onPress={() =>
                void action.run(() => removeMilestone({ id: m._id }))
              }
            />
          </View>
        </View>
      ))}
      <Field
        label="Milestone title"
        value={milestone}
        onChangeText={setMilestone}
      />
      <Button
        label="Add milestone"
        disabled={!milestone.trim() || action.busy}
        onPress={() =>
          void action.run(async () => {
            await createMilestone({ goalId: goal._id, title: milestone });
            setMilestone("");
          })
        }
      />
      <T style={s.subtitle}>Linked tasks</T>
      {!tasks.some((t) => t.goalId === goal._id) && (
        <T quiet>No linked tasks yet. Choose this goal in a task sheet.</T>
      )}
      {tasks
        .filter((t) => t.goalId === goal._id)
        .map((task) => (
          <Button
            key={task._id}
            label={`Open ${task.title}`}
            onPress={() => {
              close();
              openTask(task);
            }}
          />
        ))}
      {action.error && <T accessibilityRole="alert">{action.error}</T>}
      {action.message && <T quiet>{action.message}</T>}
    </Sheet>
  );
}
