import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
  View,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import {
  AreasEditor,
  ProjectsEditor,
  EventsEditor,
  GoalForm,
  useAction,
  type GoalFormHandle,
} from "./Editors";
import { Field, PrimaryButton, TextButton, T, s, ui } from "./ui";
import type { Area, Project, Event } from "./types";
const headings = [
  "What do you plan for?",
  "Give your work a home",
  "When are you already busy?",
  "What are you working towards?",
  "What will you do first?",
];
const descriptions = [
  "Kriyan sorts everything into areas. Start with these three and change them any time.",
  "Add projects and courses to keep related tasks together.",
  "Add your classes and meetings to see the time you have left.",
  "Choose one goal to keep your next steps in view.",
  "Write a few tasks. A day, a time and a length are all optional.",
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
  const goalForm = useRef<GoalFormHandle>(null);
  const complete = useMutation(api.profiles.completeOnboarding),
    quickAdd = useMutation(api.tasks.quickAdd),
    sample = useMutation(api.profiles.seedSample),
    action = useAction();
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === 0) return false;
        setStep(step - 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [step]);
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
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.page,
          { paddingTop: ui.spacing[5], paddingHorizontal: ui.spacing[4] },
        ]}
      >
        <T quiet>Step {step + 1} of 5</T>
        <T title>{headings[step]}</T>
        <T style={{ color: ui.colors["ink-2"], marginBottom: ui.spacing[2] }}>
          {descriptions[step]}
        </T>
        {step === 0 && <AreasEditor areas={areas} onboarding />}
        {step === 1 && (
          <ProjectsEditor areas={areas} projects={projects} onboarding />
        )}
        {step === 2 && (
          <EventsEditor
            areas={areas}
            events={events}
            today={today}
            onboarding
          />
        )}
        {step === 3 && (
          <GoalForm areas={areas} today={today} formRef={goalForm} onboarding />
        )}
        {step === 4 && (
          <>
            <Field
              label="First tasks, one per line"
              value={text}
              onChangeText={setText}
              multiline
            />
            <T quiet>Try: Review lecture notes today #school</T>
            <T quiet>Try: gym tomorrow 7am</T>
            <T quiet>Try: Plan the launch Friday #business 45m</T>
          </>
        )}
        {action.error && <T accessibilityRole="alert">{action.error}</T>}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: ui.spacing[4],
          paddingBottom: ui.spacing[3],
          gap: ui.spacing[0],
        }}
      >
        <PrimaryButton
          label="Continue"
          disabled={action.busy || !areas.length}
          onPress={() => {
            if (step === 4) void finish(true);
            else if (step === 3)
              void action.run(async () => {
                if (await goalForm.current?.save()) setStep(4);
              });
            else setStep(step + 1);
          }}
        />
        <TextButton
          label={step === 0 ? "Use sample data" : "Skip"}
          disabled={action.busy}
          onPress={() => {
            if (step === 0) void action.run(() => sample({ today }));
            else if (step === 4) void finish(false);
            else setStep(step + 1);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
