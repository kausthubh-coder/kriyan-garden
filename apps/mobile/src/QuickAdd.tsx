import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import { parse, lengthValue, relativeDay } from "@kriyan/core";
import { PrimaryButton, Tag, Sheet, T, s, ui } from "./ui";
import { TextInput, View } from "react-native";
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
    <Sheet title="Add task" close={close} hideHeading>
      <TextInput
        accessibilityLabel="Task"
        maxFontSizeMultiplier={1.3}
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder="econ outline fri 5pm #econ 45m"
        editable={!busy}
        placeholderTextColor={ui.colors["ink-3"]}
        selectionColor={ui.colors.ink}
        style={{
          minHeight: ui.control.row,
          color: ui.colors.ink,
          fontFamily: "Schibsted500",
          fontSize: ui.typeSizes[10],
          padding: 0,
        }}
      />
      <View style={s.wrap}>
        {text.trim() ? (
          <>
            <Tag
              label={area?.name ?? "Choose an area"}
              color={areaColor(area)}
            />
            {project && <Tag label={project.name} />}
            <Tag
              label={
                result.date ? relativeDay(result.date, today) : "No date yet"
              }
            />
            <Tag label={result.time ?? "Any time"} />
            <Tag
              label={
                result.durationMinutes === null
                  ? "No length"
                  : lengthValue(result.durationMinutes)
              }
              outline={result.durationMinutes === null}
            />
          </>
        ) : (
          <T quiet>Try: gym tomorrow 7am</T>
        )}
      </View>
      {error && <T accessibilityRole="alert">{error}</T>}
      <PrimaryButton
        label="Add task"
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
