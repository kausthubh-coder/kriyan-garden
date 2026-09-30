import { View } from "react-native";
import {
  countText,
  deadlineCapacity,
  formatMinutes,
  plannedMinutes,
  shortDate,
  weekdayName,
} from "@kriyan/core";
import { Dot, QuietButton, SectionHeading, Surface, T, s, ui } from "./ui";
import { areaColor, type Area, type Profile, type Task } from "./types";
import type { usePlanner } from "./usePlanner";
import { useState, type ReactNode } from "react";
export function Week({
  week,
  date,
  today,
  profile,
  areas,
  tasks,
  shown,
  select,
  row,
  open,
}: {
  week: NonNullable<ReturnType<typeof usePlanner>["week"]>;
  date: string;
  today: string;
  profile: Profile;
  areas: Area[];
  tasks: Task[];
  shown: Task[];
  select: (date: string) => void;
  row: (task: Task) => ReactNode;
  open: (task: Task) => void;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const over = week.filter(
      (day) => day.plannedMinutes > profile.dailyCapacityMinutes,
    ),
    dated = shown
      .filter((task) => task.date === date && task.status === "active")
      .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")),
    deadlines = shown
      .filter((task) => task.deadline && task.status === "active")
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          gap: ui.spacing[0],
          marginTop: ui.spacing[1],
        }}
      >
        {week.map((day) => (
          <Surface
            key={day.date}
            label={`Select ${shortDate(day.date)}${day.plannedMinutes > profile.dailyCapacityMinutes ? ", over capacity" : ""}`}
            onPress={() => select(day.date)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: ui.spacing[0],
              paddingVertical: ui.spacing[1],
              backgroundColor: day.date === date ? ui.colors.s2 : ui.colors.bg,
              borderRadius: ui.radii[4],
            }}
          >
            <T quiet style={{ fontSize: ui.typeSizes[2] }}>
              {weekdayName(day.date).slice(0, 3)}
            </T>
            <T
              style={{
                fontFamily: "Schibsted600",
                fontSize: ui.typeSizes[9],
                color:
                  day.plannedMinutes > profile.dailyCapacityMinutes
                    ? ui.colors.hot
                    : ui.colors.ink,
              }}
            >
              {Number(day.date.slice(-2))}
            </T>
            <View
              style={{
                width: ui.spacing[4],
                height: ui.spacing[0],
                borderRadius: ui.spacing[0] / 2,
                backgroundColor: ui.colors.s2,
                overflow: "hidden",
                flexDirection: "row",
              }}
            >
              {areas.map((area) => (
                <View
                  key={area._id}
                  style={{
                    height: "100%",
                    width: `${((day.plannedMinutesByArea[area._id] ?? 0) / Math.max(1, day.plannedMinutes, profile.dailyCapacityMinutes)) * 100}%`,
                    backgroundColor: areaColor(area),
                  }}
                />
              ))}
            </View>
          </Surface>
        ))}
      </View>
      {over.length > 0 && (
        <T quiet style={{ marginTop: ui.spacing[1] }}>
          <T
            style={{
              color: ui.colors.hot,
              fontFamily: "Schibsted600",
              fontSize: ui.type.meta,
            }}
          >
            {over
              .map(
                (day) =>
                  `${weekdayName(day.date)} is over capacity by ${formatMinutes(day.plannedMinutes - profile.dailyCapacityMinutes)}`,
              )
              .join(". ")}
            .
          </T>{" "}
          Move something to a lighter day.
        </T>
      )}
      <SectionHeading
        title={weekdayName(date)}
        value={`${countText(dated.length, "task")} left${plannedMinutes(dated) ? `, ${formatMinutes(plannedMinutes(dated))}` : ""}`}
      />
      {dated.length ? (
        (expandedDate === date ? dated : dated.slice(0, 3)).map(row)
      ) : (
        <T quiet>Nothing planned for this day.</T>
      )}
      {dated.length > 3 && (
        <QuietButton
          label={
            expandedDate === date
              ? "Show fewer tasks"
              : `Show all ${countText(dated.length, "task")}`
          }
          onPress={() => setExpandedDate(expandedDate === date ? null : date)}
        />
      )}
      <SectionHeading title="Deadlines" value="Time needed against time free" />
      {!deadlines.length && <T quiet>No upcoming deadlines.</T>}
      {deadlines.map((task) => {
        const free = deadlineCapacity(
            today,
            task.deadline ?? today,
            profile.dailyCapacityMinutes,
            tasks,
          ),
          slack =
            task.durationMinutes === null ? null : free - task.durationMinutes;
        return (
          <Surface
            key={task._id}
            label={`Open deadline for ${task.title}`}
            onPress={() => open(task)}
            style={{
              minHeight: ui.control.task,
              paddingVertical: ui.spacing[1],
              borderBottomWidth: 1,
              borderColor: ui.colors.line,
            }}
          >
            <View style={s.heading}>
              <View style={{ flex: 1 }}>
                <View style={[s.heading, { justifyContent: "flex-start" }]}>
                  <Dot
                    color={areaColor(areas.find((a) => a._id === task.areaId))}
                  />
                  <T
                    numberOfLines={1}
                    style={{ flex: 1, fontFamily: "Schibsted500" }}
                  >
                    {task.title}
                  </T>
                </View>
                <T quiet>
                  {task.deadline ? shortDate(task.deadline) : ""}.{" "}
                  {task.durationMinutes === null
                    ? "No length set"
                    : `${formatMinutes(task.durationMinutes)} needed`}
                  , {formatMinutes(free)} free
                </T>
              </View>
              <T
                quiet
                style={{
                  maxWidth: "35%",
                  textAlign: "right",
                  flexShrink: 0,
                  color:
                    slack !== null && slack < 0
                      ? ui.colors.hot
                      : ui.colors["ink-2"],
                }}
              >
                {slack === null
                  ? "Set a length to compare capacity"
                  : slack < 0
                    ? `${formatMinutes(-slack)} over capacity`
                    : `${formatMinutes(slack)} to spare`}
              </T>
            </View>
          </Surface>
        );
      })}
    </View>
  );
}
