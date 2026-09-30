"use client";
import { useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import {
  AreasEditor,
  ProjectsEditor,
  EventsEditor,
  HabitsEditor,
} from "./PlannerEditors";
import { useFormAction } from "./useFormAction";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { ViewHeader } from "./ViewParts";
import type { Area, Project, Profile } from "./types";
import s from "./App.module.css";
export function Settings({
  areas,
  projects,
  events,
  habits,
  profile,
  today,
  reset,
}: {
  areas: Area[];
  projects: Project[];
  events: Doc<"events">[];
  habits: Doc<"habits">[];
  profile: Profile;
  today: string;
  reset: () => void;
}) {
  const update = useMutation(api.profiles.update),
    resetAll = useMutation(api.profiles.resetAll),
    action = useFormAction();
  const [confirmation, setConfirmation] = useState("");
  return (
    <main className={s.page}>
      <ViewHeader title="Settings" />
      <div className={s.settings}>
        <AreasEditor areas={areas} />
        <ProjectsEditor areas={areas} projects={projects} />
        <EventsEditor areas={areas} events={events} today={today} />
        <HabitsEditor areas={areas} habits={habits} />
        <section className={s.editor}>
          <h2>Your day</h2>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void action.run(() =>
                update({
                  patch: {
                    dailyCapacityMinutes: Number(d.get("capacity")),
                    dayStartHour: Number(d.get("start")),
                    dayEndHour: Number(d.get("end")),
                    timezone: String(d.get("timezone")),
                  },
                }),
              );
            }}
          >
            <fieldset disabled={action.busy}>
              <label>
                Daily capacity in minutes
                <input
                  type="number"
                  name="capacity"
                  required
                  min={1}
                  max={1440}
                  defaultValue={profile.dailyCapacityMinutes}
                />
              </label>
              <div className={s.inlineForm}>
                <label>
                  Day start hour
                  <input
                    name="start"
                    type="number"
                    required
                    min={0}
                    max={23}
                    defaultValue={profile.dayStartHour}
                  />
                </label>
                <label>
                  Day end hour
                  <input
                    name="end"
                    type="number"
                    required
                    min={1}
                    max={24}
                    defaultValue={profile.dayEndHour}
                  />
                </label>
              </div>
              <label>
                Timezone
                <input
                  name="timezone"
                  required
                  defaultValue={profile.timezone}
                />
              </label>
              <p>
                Your browser timezone is{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}.
              </p>
              <button className={s.btn}>Save preferences</button>
            </fieldset>
          </form>
        </section>
        <section className={s.editor}>
          <h2>Account and security</h2>
          <UserProfile appearance={clerkAppearance} routing="hash" />
        </section>
        <section className={s.editor}>
          <h2>Reset everything</h2>
          <p>
            This removes all your planner data, including tasks, goals, areas
            and settings. Type RESET to confirm.
          </p>
          <form
            className={s.inlineForm}
            onSubmit={async (e) => {
              e.preventDefault();
              if (confirmation !== "RESET") return;
              if (await action.run(() => resetAll(), "Reset started.")) reset();
            }}
          >
            <label>
              Type RESET
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              className={`${s.btn} ${s.danger}`}
              disabled={confirmation !== "RESET" || action.busy}
            >
              Reset everything
            </button>
          </form>
        </section>
        {action.error && <p role="alert">{action.error}</p>}
        {action.message && <p role="status">{action.message}</p>}
      </div>
    </main>
  );
}
