import { useCallback, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { formatMinutes, layoutIntervals, minutesOf } from "@kriyan/core";
import { theme } from "./theme";
import { snapTime, snapLength } from "./helpers";
import { Button, Surface, T, s } from "./ui";
import {
  areaColor,
  type Area,
  type Day,
  type Profile,
  type Task,
} from "./types";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
const hh = theme.layout.hourHeight;
// Two lines plus the marker/focus borders must fit inside the tappable block.
const minimumBlockHeight = theme.layout.controlHeight + theme.spacing[1] * 2;
export function DayTimeline({
  day,
  areas,
  profile,
  today,
  now,
  open,
  update,
  dragging,
}: {
  day: Day;
  areas: Area[];
  profile: Profile;
  today: string;
  now: number;
  open: (task: Task) => void;
  update: (task: Task, patch: TaskPatch) => Promise<unknown>;
  dragging: (active: boolean) => void;
}) {
  const grid = useRef<View>(null),
    gridTop = useRef(0), grabbedOffset = useRef(0),
    [selected, setSelected] = useState<string | null>(null),
    [dragId, setDragId] = useState<string | null>(null),
    [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const start = profile.dayStartHour,
    end = profile.dayEndHour;
  const height = (end - start) * hh;
  const pick = useCallback((task: Task, absoluteY: number) => {
    grid.current?.measureInWindow((_x, y) => {
      gridTop.current = y;
      grabbedOffset.current = task.time ? absoluteY - y - (minutesOf(task.time) - start * 60) * hh / 60 : 0;
    });
    setSelected(task._id);
    setDragId(task._id);
    dragging(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [dragging, start]);
  const drop = useCallback((task: Task, absoluteY: number) => {
    const y = absoluteY - gridTop.current - grabbedOffset.current;
    if (y >= 0 && y <= height) {
      void update(task, {
        date: day.date,
        time: snapTime(y, start, end, task.durationMinutes),
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDragOffset({ x: 0, y: 0 });
    setDragId(null);
    dragging(false);
  }, [height, update, day.date, start, end, dragging]);
  const finishDrag = () => { setDragId(null); setDragOffset({ x: 0, y: 0 }); dragging(false); };
  const entries = layoutIntervals([
    ...day.timed.map((task) => ({
      key: task._id,
      task,
      event: null,
      start: minutesOf(task.time ?? "00:00"),
      end:
        minutesOf(task.time ?? "00:00") +
        Math.max(
          (minimumBlockHeight * 60) / hh,
          task.durationMinutes ?? 0,
        ),
    })),
    ...day.events.map((event) => ({
      key: event._id,
      task: null,
      event,
      start: minutesOf(event.startTime),
      end: minutesOf(event.endTime),
    })),
  ]);
  return (
    <View>
      <T style={s.subtitle}>Any time today</T>
      {day.anytime.length === 0 && (
        <T quiet>No any-time tasks. Add a task without a time.</T>
      )}
      {day.anytime.map((task) => (
        <TaskDrag key={task._id} task={task} pick={pick} drop={drop} offset={setDragOffset} finish={finishDrag}>
          <View
            style={[
              s.card,
              dragId === task._id && {
                zIndex: 20,
                transform: [
                  { translateX: dragOffset.x },
                  { translateY: dragOffset.y },
                ],
              },
            ]}
          >
            <Surface label={`Open ${task.title}`} onPress={() => open(task)}>
              <T>{task.title}</T>
              <T quiet>
                {areas.find((a) => a._id === task.areaId)?.name}
                {task.durationMinutes === null
                  ? ", no length"
                  : `, ${formatMinutes(task.durationMinutes)}`}
                {task.status === "completed" ? ", done" : ""}
              </T>
            </Surface>
          </View>
        </TaskDrag>
      ))}
      <T quiet>
        Hold a task to move it onto the timeline. Tap to set its time or length.
      </T>
      <View
        ref={grid}
        collapsable={false}
        style={{ height, marginLeft: theme.layout.phoneTimelineGutter, marginTop: theme.spacing[3] }}
      >
        {Array.from({ length: end - start + 1 }, (_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: -theme.layout.phoneTimelineGutter,
              right: 0,
              top: i * hh,
              borderTopWidth: 1,
              borderColor: theme.colors.line,
            }}
          >
            <T
              quiet
              style={{
                position: "absolute",
                top: -10,
                width: 44,
                backgroundColor: theme.colors.bg,
              }}
            >
              {String(start + i).padStart(2, "0")}:00
            </T>
          </View>
        ))}
        {entries.map((entry) => {
          const task = entry.task,
            event = entry.event;
          const top = ((entry.start - start * 60) * hh) / 60;
          const actualHeight = Math.max(
            minimumBlockHeight,
            ((task?.durationMinutes ?? entry.end - entry.start) * hh) / 60,
          );
          if (top < 0 || top >= height) return null;
          if (event)
            return (
              <View
                key={entry.key}
                style={[
                  styles.block,
                  {
                    top,
                    height: Math.min(actualHeight, height - top),
                    left: `${(entry.column / entry.columns) * 100}%`,
                    width: `${100 / entry.columns}%`,
                    backgroundColor: theme.colors.s3,
                  },
                ]}
              >
                <T numberOfLines={1} style={{ fontFamily: "Schibsted600" }}>
                  {event.title}
                </T>
                <T quiet numberOfLines={1}>
                  {event.startTime}, {event.location || "Class"}
                </T>
              </View>
            );
          if (!task) return null;
          const color = areaColor(areas.find((a) => a._id === task.areaId)),
            marker = task.durationMinutes === null,
            done = task.status === "completed";
          return (
            <TaskDrag key={entry.key} task={task} pick={pick} drop={drop} offset={setDragOffset} finish={finishDrag}>
              <View
                style={[
                  styles.block,
                  {
                    top,
                    height: Math.min(actualHeight, height - top),
                    left: `${(entry.column / entry.columns) * 100}%`,
                    width: `${100 / entry.columns}%`,
                    backgroundColor: done ? theme.colors.s2 : marker ? theme.colors.bg : color,
                    borderColor: color,
                    borderWidth: marker ? 1.5 : 0,
                  },
                  dragId === task._id && {
                    zIndex: 20,
                    transform: [{ translateY: dragOffset.y }],
                  },
                ]}
              >
                <Surface
                  label={`Open ${task.title}, ${task.time}${marker ? ", no length" : ""}${done ? ", done" : ""}`}
                  onPress={() => {
                    setSelected(task._id);
                    open(task);
                  }}
                  style={{ flex: 1, paddingRight: selected === task._id ? theme.layout.controlHeight : 0 }}
                >
                  <T
                    numberOfLines={1}
                    style={{
                      color: done ? theme.colors["ink-3"] : marker ? theme.colors.ink : theme.colors.on,
                      fontFamily: "Schibsted600",
                      textDecorationLine: done ? "line-through" : "none",
                      fontSize: theme.typeSizes[6],
                    }}
                  >
                    {task.title}
                  </T>
                  <T
                    numberOfLines={1}
                    style={{
                      color: done ? theme.colors["ink-3"] : marker ? theme.colors["ink-2"] : theme.colors.on,
                      fontSize: theme.typeSizes[3],
                    }}
                  >
                    {task.time}
                    {marker
                      ? ", no length"
                      : `, ${formatMinutes(task.durationMinutes ?? 0)}`}
                  </T>
                </Surface>
                {selected === task._id && (
                  <Resize
                    task={task}
                    save={(value) => update(task, { durationMinutes: value })}
                    dragging={dragging}
                  />
                )}
              </View>
            </TaskDrag>
          );
        })}
        {day.date === today && now >= start * 60 && now <= end * 60 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -theme.layout.phoneTimelineGutter,
              right: 0,
              top: ((now - start * 60) * hh) / 60,
              borderTopWidth: 1,
              borderColor: theme.colors.hot,
            }}
          >
            <T
              style={{
                color: theme.colors.hot,
                fontSize: theme.typeSizes[1],
                backgroundColor: theme.colors.bg,
                alignSelf: "flex-start",
              }}
            >
              Now
            </T>
          </View>
        )}
      </View>
      {day.timed
        .filter(
          (t) =>
            minutesOf(t.time ?? "00:00") < start * 60 ||
            minutesOf(t.time ?? "00:00") >= end * 60,
        )
        .map((task) => (
          <Button
            key={task._id}
            label={`Open ${task.title}, outside day hours`}
            onPress={() => open(task)}
          />
        ))}
    </View>
  );
}
function TaskDrag({ task, pick, drop, offset, finish, children }: { task: Task; pick: (task: Task, y: number) => void; drop: (task: Task, y: number) => void; offset: (offset: { x: number; y: number }) => void; finish: () => void; children: ReactNode }) {
  const pan = Gesture.Pan().activateAfterLongPress(350).runOnJS(true).onStart(event => pick(task, event.absoluteY)).onUpdate(event => offset({ x: event.translationX, y: event.translationY })).onEnd(event => drop(task, event.absoluteY)).onFinalize(finish);
  return <GestureDetector gesture={pan}>{children}</GestureDetector>;
}
function Resize({
  task,
  save,
  dragging,
}: {
  task: Task;
  save: (value: number) => Promise<unknown>;
  dragging: (active: boolean) => void;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      dragging(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) =>
      setPreview(
        snapLength(
          ((task.durationMinutes ?? 15) * hh) / 60 + event.translationY,
        ),
      ),
    )
    .onEnd((event) => {
      void save(
        snapLength(
          ((task.durationMinutes ?? 15) * hh) / 60 + event.translationY,
        ),
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      dragging(false);
      setPreview(null);
    });
  return (
    <GestureDetector gesture={pan}>
      <View style={{ position: "absolute", bottom: 0, right: 0, zIndex: 30 }}>
        <Button
          label={preview ? `Length ${preview}m` : "Resize task"}
          icon="resize"
          style={{ width: theme.layout.controlHeight, paddingHorizontal: 0 }}
          onPress={() => void save((task.durationMinutes ?? 0) + 15)}
        />
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  block: {
    position: "absolute",
    borderRadius: theme.radii[2],
    paddingHorizontal: theme.spacing[1],
    overflow: "visible",
  },
});
