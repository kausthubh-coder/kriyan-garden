import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import {
  AreasEditor,
  ProjectsEditor,
  EventsEditor,
  GoalForm,
  useAction,
} from "./Editors";
import { Button, Field, T, s } from "./ui";
import type { Area, Project, Event } from "./types";
const steps = [
  "Areas",
  "Projects and courses",
  "Classes and fixed meetings",
  "One goal",
  "First tasks",
];
export function Onboarding({
  areas,
  projects,
  events,
  today,
}: {
  areas: Area[];
  projects: Project[];
  events: Event[];
  today: string;
}) {
  const [step, setStep] = useState(0),
    [text, setText] = useState("");
  const complete = useMutation(api.profiles.completeOnboarding),
    quickAdd = useMutation(api.tasks.quickAdd),
    action = useAction();
  const finish = (withTasks: boolean) =>
    action.run(async () => {
      if (withTasks) {
        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        for (let index = 0; index < lines.length; index++) {
          await quickAdd({ text: lines[index], today });
          setText(lines.slice(index + 1).join("\n"));
        }
      }
      await complete({});
    });
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      <T quiet>Step {step + 1} of 5</T>
      <T title>{steps[step]}</T>
      <T quiet>
        Make room for School, Business and Life. You can change everything in
        settings.
      </T>
      {step === 0 && <AreasEditor areas={areas} />}
      {step === 1 && <ProjectsEditor areas={areas} projects={projects} />}
      {step === 2 && (
        <EventsEditor areas={areas} events={events} today={today} />
      )}
      {step === 3 && (
        <GoalForm areas={areas} today={today} saved={() => setStep(4)} />
      )}
      {step === 4 && (
        <>
          <Field
            label="First tasks, one per line"
            value={text}
            onChangeText={setText}
            multiline
          />
          <T quiet>
            Try: Review lecture notes today School. Dates, times and optional
            lengths are read from each line.
          </T>
        </>
      )}
      {action.error && <T accessibilityRole="alert">{action.error}</T>}
      <View style={s.wrap}>
        {step > 0 && (
          <Button
            label="Go back"
            disabled={action.busy}
            onPress={() => setStep(step - 1)}
          />
        )}
        <Button
          label="Skip step"
          disabled={action.busy}
          onPress={() => {
            if (step === 4) void finish(false);
            else setStep(step + 1);
          }}
        />
        <Button
          label={step === 4 ? "Finish setup" : "Continue setup"}
          primary
          disabled={action.busy || !areas.length}
          onPress={() => {
            if (step === 4) void finish(true);
            else setStep(step + 1);
          }}
        />
      </View>
    </ScrollView>
  );
}
