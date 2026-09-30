"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import { AreasEditor, ProjectsEditor, EventsEditor } from "./PlannerEditors";
import { GoalForm } from "./GoalForm";
import { useFormAction } from "./useFormAction";
import type { Area, Project } from "./types";
import s from "./App.module.css";
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
  finish,
}: {
  areas: Area[];
  projects: Project[];
  events: Doc<"events">[];
  today: string;
  finish: () => void;
}) {
  const [step, setStep] = useState(0),
    [text, setText] = useState("");
  const complete = useMutation(api.profiles.completeOnboarding),
    sample = useMutation(api.profiles.seedSample),
    quickAdd = useMutation(api.tasks.quickAdd),
    action = useFormAction();
  async function done(withTasks = false) {
    if (
      await action.run(async () => {
        if (withTasks) {
          // Clear each successful line so a retry cannot create duplicates.
          const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          for (let i = 0; i < lines.length; i++) {
            await quickAdd({ text: lines[i], today });
            setText(lines.slice(i + 1).join("\n"));
          }
        }
        await complete({});
      }, "Your planner is ready.")
    )
      finish();
  }
  return (
    <main className={`${s.page} ${s.welcome}`}>
      <div className={s.welcomeContent}>
        <p className={s.quiet}>Step {step + 1} of 5</p>
        <h1>{steps[step]}</h1>
        <p>
          Make room for School, Business and Life. You can change everything in
          settings.
        </p>
        {step === 0 && (
          <>
            <AreasEditor areas={areas} />
            <button
              className={s.f}
              disabled={action.busy}
              onClick={async () => {
                if (await action.run(() => sample({ today }))) finish();
              }}
            >
              Explore with sample data
            </button>
          </>
        )}
        {step === 1 && <ProjectsEditor areas={areas} projects={projects} />}
        {step === 2 && (
          <EventsEditor areas={areas} events={events} today={today} />
        )}
        {step === 3 && (
          <GoalForm areas={areas} today={today} saved={() => setStep(4)} />
        )}
        {step === 4 && (
          <div className={s.form}>
            <label>
              First tasks, one per line
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Write your first tasks here"
              />
            </label>
            <p>Try these examples:</p>
            <ul>
              <li>Review lecture notes today School</li>
              <li>gym tomorrow 7am</li>
              <li>Call family friday Life</li>
            </ul>
            <p>Dates, times and optional lengths are read from each line.</p>
          </div>
        )}
        {action.error && <p role="alert">{action.error}</p>}
        <div className={s.formHeading}>
          {step > 0 && (
            <button
              className={s.f}
              disabled={action.busy}
              onClick={() => setStep(step - 1)}
            >
              Go back
            </button>
          )}
          <button
            className={s.f}
            disabled={action.busy}
            onClick={() => (step === 4 ? void done() : setStep(step + 1))}
          >
            Skip step
          </button>
          <button
            className={s.btn}
            disabled={action.busy || !areas.length}
            onClick={() => (step === 4 ? void done(true) : setStep(step + 1))}
          >
            {step === 4 ? "Finish setup" : "Continue setup"}
          </button>
        </div>
      </div>
    </main>
  );
}
