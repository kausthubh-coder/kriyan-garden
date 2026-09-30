import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { parse, formatMinutes } from "@kriyan/core";
import { Button, Field, Sheet, T, s } from "./ui";
import { View } from "react-native";
import { areaColor, type Area, type Project } from "./types";
export function QuickAdd({
  initialText,
  today,
  date,
  areas,
  projects,
  close,
}: {
  initialText: string;
  today: string;
  date: string | null;
  areas: Area[];
  projects: Project[];
  close: () => void;
}) {
  const [text, setText] = useState(initialText),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const create = useMutation(api.tasks.create);
  const result = parse(text, {
    today,
    defaultDate: date,
    defaultAreaId: areas[0]?._id ?? "",
    areas: areas.map((a) => ({ id: a._id, name: a.name })),
    projects: projects.map((p) => ({
      id: p._id,
      name: p.name,
      areaId: p.areaId,
    })),
  });
  const area = areas.find((a) => a._id === result.areaId),
    project = projects.find((p) => p._id === result.projectId);
  return (
    <Sheet title="Add a task" close={close}>
      <Field
        label="Task"
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder="econ outline fri 5pm #econ 45m"
        editable={!busy}
      />
      <View style={s.wrap}>
        {text.trim() ? (
          <>
            <T style={{ color: areaColor(area) }}>
              {area?.name ?? "Choose an area"}
              {project ? `, ${project.name}` : ""}
            </T>
            <T quiet>{result.date ?? "No date yet"}</T>
            <T quiet>{result.time ?? "Any time"}</T>
            <T quiet>
              {result.durationMinutes === null
                ? "No length"
                : formatMinutes(result.durationMinutes)}
            </T>
          </>
        ) : (
          <T quiet>Try: gym tomorrow 7am</T>
        )}
      </View>
      <T quiet>Type a day, a time, a length or a #tag. All optional.</T>
      {error && <T accessibilityRole="alert">{error}</T>}
      <Button
        label="Add task"
        primary
        disabled={!result.title || !area || busy}
        onPress={() => {
          if (!area) return;
          setBusy(true);
          setError("");
          void create({
            ...result,
            areaId: area._id,
            projectId: project?._id ?? null,
            date: result.time && !result.date ? today : result.date,
          })
            .then(close)
            .catch(() =>
              setError(
                "Task could not be added. Check your connection and retry adding it.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      />
    </Sheet>
  );
}
