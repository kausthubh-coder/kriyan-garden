import { useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { formatMinutes } from "@kriyan/core";
import { Button, Surface, T, s } from "./ui";
import { areaColor, type Area, type Task } from "./types";
export function TaskRow({
  task,
  area,
  open,
  toggle,
  schedule,
}: {
  task: Task;
  area?: Area;
  open: () => void;
  toggle: () => Promise<unknown>;
  schedule: () => void;
}) {
  const [dx, setDx] = useState(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onUpdate((event) => setDx(event.translationX))
    .onEnd((event) => {
      setDx(0);
      if (event.translationX > 80) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        void toggle();
      }
      if (event.translationX < -80) schedule();
    })
    .onFinalize(() => setDx(0));
  return (
    <GestureDetector gesture={pan}>
      <View>
        <View
          style={[
            s.heading,
            { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
          ]}
        >
          <T quiet>{task.status === "completed" ? "Reopen" : "Complete"}</T>
          <T quiet>Schedule</T>
        </View>
        <View style={[s.heading, s.card, { transform: [{ translateX: dx }] }]}>
          <Button
            label={`${task.status === "completed" ? "Reopen" : "Complete"} ${task.title}`}
            icon={task.status === "completed" ? "check" : "goals"}
            color={areaColor(area)}
            onPress={() => void toggle()}
          />
          <Surface
            label={`Open ${task.title}`}
            onPress={open}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <T
              style={{
                textDecorationLine:
                  task.status === "completed" ? "line-through" : "none",
                opacity: task.status === "completed" ? 0.6 : 1,
              }}
            >
              {task.title}
            </T>
            <T quiet>
              {task.time ?? "Any time"}
              {task.durationMinutes === null
                ? ""
                : `, ${formatMinutes(task.durationMinutes)}`}
              {task.deadline ? `, due ${task.deadline}` : ""}
            </T>
          </Surface>
          <Button
            label={`Schedule ${task.title}`}
            icon="week"
            onPress={schedule}
          />
        </View>
      </View>
    </GestureDetector>
  );
}
