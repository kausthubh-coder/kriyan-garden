import { useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { deadlineValue, lengthValue, shortDate } from "@kriyan/core";
import { Check, Surface, T } from "./index";
import { ui } from "./tokens";
import { areaColor, type Area, type Task } from "../types";
type Props = {
  task: Task;
  area?: Area;
  project?: string;
  today: string;
  open: () => void;
  toggle: () => Promise<unknown>;
  schedule: () => void;
  card?: boolean;
  divider?: boolean;
};
export function TaskRow({
  task,
  area,
  project,
  today,
  open,
  toggle,
  schedule,
  card = false,
  divider = true,
}: Props) {
  const [dx, setDx] = useState(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onUpdate((event) => setDx(event.translationX))
    .onEnd((event) => {
      setDx(0);
      if (event.translationX > 80) void toggle();
      if (event.translationX < -80) schedule();
    })
    .onFinalize(() => setDx(0));
  const done = task.status === "completed",
    deadline = deadlineValue(task.deadline, today);
  return (
    <GestureDetector gesture={pan}>
      <View>
        <View
          style={{
            position: "absolute",
            inset: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <T quiet>{done ? "Reopen" : "Complete"}</T>
          <T quiet>Set day</T>
        </View>
        <View
          style={{
            transform: [{ translateX: dx }],
            flexDirection: "row",
            alignItems: "center",
            minHeight: ui.control.task,
            backgroundColor: card ? ui.colors.s2 : ui.colors.bg,
            borderRadius: card ? ui.radii[4] : 0,
            borderBottomWidth: card || !divider ? 0 : 1,
            borderColor: ui.colors.line,
            marginBottom: card ? ui.spacing[1] : 0,
            paddingHorizontal: card ? ui.spacing[0] : 0,
            paddingVertical: ui.spacing[0],
          }}
        >
          <Check
            label={`${done ? "Reopen" : "Complete"} ${task.title}`}
            checked={done}
            color={areaColor(area)}
            onPress={() => void toggle()}
          />
          <Surface
            label={`Open ${task.title}`}
            onPress={open}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: ui.spacing[1],
            }}
          >
            <View style={{ flex: 1 }}>
              <T
                numberOfLines={card ? 2 : 1}
                style={{
                  fontFamily: "Schibsted500",
                  textDecorationLine: done ? "line-through" : "none",
                  color: done ? ui.colors["ink-3"] : ui.colors.ink,
                }}
              >
                {task.title}
              </T>
              <T quiet>
                {task.deadline && (
                  <T
                    style={{
                      color: deadline.urgent
                        ? ui.colors.hot
                        : ui.colors["ink-3"],
                      fontSize: ui.type.meta,
                    }}
                  >
                    Due {shortDate(task.deadline)}
                    {project ? ", " : ""}
                  </T>
                )}
                {project ?? (!task.deadline ? area?.name : "")}
              </T>
            </View>
            <T quiet>
              {task.time ??
                (task.durationMinutes ? lengthValue(task.durationMinutes) : "")}
            </T>
          </Surface>
        </View>
      </View>
    </GestureDetector>
  );
}
export const TaskCard = (props: Omit<Props, "card">) => (
  <TaskRow {...props} card />
);
