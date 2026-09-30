import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import {
  Choices,
  Field,
  ListRow,
  PrimaryButton,
  QuietButton,
  Sheet,
  Status,
  TextButton,
  T,
  s,
} from "./ui";
import { areaColor, type Area } from "./types";
import { useAction } from "./Editors";
export function Habits({ areas, today }: { areas: Area[]; today: string }) {
  const habits = useQuery(api.habits.list, {}),
    create = useMutation(api.habits.create),
    update = useMutation(api.habits.update),
    remove = useMutation(api.habits.remove),
    log = useMutation(api.habits.log),
    action = useAction();
  const [editing, setEditing] = useState(false),
    [selected, setSelected] = useState<Doc<"habits"> | null>(null),
    [title, setTitle] = useState(""),
    [areaId, setAreaId] = useState(areas[0]?._id ?? ""),
    [target, setTarget] = useState("3");
  if (!habits) return <Status loading message="Loading habits." />;
  return (
    <View style={s.field}>
      <QuietButton
        label="Add habit"
        onPress={() => {
          setSelected(null);
          setTitle("");
          setTarget("3");
          setEditing(true);
        }}
      />
      {!habits.length && (
        <T quiet>No habits yet. Add something you want to do each week.</T>
      )}
      {habits.map((habit) => (
        <ListRow
          key={habit._id}
          label={habit.title}
          color={areaColor(areas.find((area) => area._id === habit.areaId))}
          value={`${habit.weeklyTarget} a week`}
          onPress={() => {
            setSelected(habit);
            setTitle(habit.title);
            setTarget(String(habit.weeklyTarget));
            setAreaId(habit.areaId);
            setEditing(true);
          }}
        />
      ))}
      {editing && (
        <Sheet
          title={selected ? "Edit habit" : "Add habit"}
          close={() => setEditing(false)}
        >
          <Field label="Habit title" value={title} onChangeText={setTitle} />
          <Choices
            label="Area"
            value={areaId}
            choices={areas.map((area) => ({
              value: area._id,
              label: area.name,
              color: areaColor(area),
            }))}
            change={setAreaId}
          />
          <Field
            label="Weekly target"
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
          />
          <PrimaryButton
            label="Save habit"
            disabled={action.busy || !title.trim()}
            onPress={() =>
              void action.run(async () => {
                const area = areas.find((a) => a._id === areaId);
                if (!area)
                  throw new Error("Choose an area before saving the habit.");
                const fields = {
                  title,
                  areaId: area._id,
                  weeklyTarget: Number(target),
                };
                if (selected) await update({ id: selected._id, patch: fields });
                else await create(fields);
                setEditing(false);
              })
            }
          />
          {selected && (
            <>
              <QuietButton
                label="Log today"
                disabled={action.busy}
                onPress={() =>
                  void action.run(() =>
                    log({ habitId: selected._id, date: today }),
                  )
                }
              />
              <TextButton
                label="Delete habit"
                danger
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await remove({ id: selected._id });
                    setEditing(false);
                  })
                }
              />
            </>
          )}
          {action.error && <T accessibilityRole="alert">{action.error}</T>}
          {action.message && <T quiet>{action.message}</T>}
        </Sheet>
      )}
    </View>
  );
}
