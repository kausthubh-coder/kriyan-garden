"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import {
  formatMinutes,
  timeOf,
  timeValue,
  minutesOf,
  timezoneValue,
} from "@kriyan/core";
import {
  AreasRows,
  ProjectsRows,
  EventsRows,
  HabitsRows,
} from "./SetupEditors";
import { SaveFeedback, useInlineSave } from "./useInlineSave";
import { PropertyList } from "./PropertyList";
import { TimeField } from "./TimeField";
import { AccountSettings } from "./AccountSettings";
import { Icon } from "./Icon";
import type { Area, Project, Profile, Task } from "./types";
import s from "./Settings.module.css";
import shared from "./Onboarding.module.css";
const sections = [
  ["areas", "Areas"],
  ["projects", "Projects and courses"],
  ["classes", "Classes and meetings"],
  ["habits", "Habits"],
  ["planning", "Planning"],
  ["account", "Account"],
  ["reset", "Reset everything"],
] as const;
const descriptions: Record<string, string> = {
  areas:
    "The parts of your life you plan for. Every task, goal and class belongs to one.",
  projects: "Projects and courses inside each area.",
  classes:
    "Fixed weekly times. They show on the timeline and count against your free time.",
  habits: "Small things you want to do each week, without a streak to keep.",
  planning: "How much you plan for a day, and when your day runs.",
  account: "Manage your sign-in details and account security.",
  reset:
    "This deletes all your tasks, goals, areas, projects, classes, habits and planner settings. Type RESET to confirm.",
};
export function Settings({
  areas,
  projects,
  events,
  habits,
  profile,
  tasks = [],
  today,
  reset,
  loading = false,
  error,
  retry,
}: {
  areas: Area[];
  projects: Project[];
  events: Doc<"events">[];
  habits: Doc<"habits">[];
  profile?: Profile;
  tasks?: Task[];
  today: string;
  reset: () => void;
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  const pathname = usePathname();
  const slug = pathname.split("/")[3] ?? "areas";
  const section = sections.find(([key]) => key === slug) ?? sections[0];
  const action = useInlineSave(),
    resetAll = useMutation(api.profiles.resetAll);
  const [confirmation, setConfirmation] = useState("");
  return (
    <main
      className={s.layout}
      data-section-open={pathname !== "/app/settings"}
      aria-busy={loading}
    >
      <nav className={s.index} aria-label="Settings sections">
        <h1>Settings</h1>
        {sections.map(([key, name]) => (
          <Link
            href={`/app/settings/${key}`}
            key={key}
            aria-current={key === section[0] ? "page" : undefined}
          >
            {name}
          </Link>
        ))}
      </nav>
      <div className={s.body} key={section[0]}>
        <Link className={s.back} href="/app/settings">
          <Icon name="prev" />
          Settings
        </Link>
        <section aria-label={section[1]}>
          <h2>{section[1]}</h2>
          <p className={s.description}>{descriptions[section[0]]}</p>
          {loading ? (
            <div role="status" aria-label="Loading settings">
              <div className={shared.skeleton} />
              <div className={shared.skeleton} />
              <div className={shared.skeleton} />
            </div>
          ) : (
            <>
              {section[0] === "areas" && (
                <AreasRows areas={areas} projects={projects} tasks={tasks} />
              )}
              {section[0] === "projects" && (
                <ProjectsRows areas={areas} projects={projects} />
              )}
              {section[0] === "classes" && (
                <EventsRows areas={areas} events={events} today={today} />
              )}
              {section[0] === "habits" && (
                <HabitsRows areas={areas} habits={habits} />
              )}
              {section[0] === "planning" && profile && (
                <Planning profile={profile} />
              )}
              {section[0] === "account" && <AccountSettings />}
              {section[0] === "reset" && (
                <form
                  className={shared.form}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      confirmation === "RESET" &&
                      (await action.run("reset", () => resetAll()))
                    )
                      reset();
                  }}
                >
                  <label className={shared.field}>
                    <span className={shared.label}>Type RESET</span>
                    <input
                      className={shared.input}
                      value={confirmation}
                      autoComplete="off"
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                  <div>
                    <button
                      className={shared.dangerButton}
                      disabled={
                        confirmation !== "RESET" || action.feedback.reset?.busy
                      }
                    >
                      Reset everything
                    </button>
                  </div>
                  <SaveFeedback state={action.feedback.reset} />
                </form>
              )}
            </>
          )}
          {error && (
            <p role="alert" className={`${shared.feedback} ${shared.error}`}>
              {error}
              <button className={shared.textButton} onClick={retry}>
                Retry loading
              </button>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
function Planning({ profile }: { profile: Profile }) {
  const update = useMutation(api.profiles.update),
    action = useInlineSave();
  const [open, setOpen] = useState<string | null>(null),
    [capacity, setCapacity] = useState(String(profile.dailyCapacityMinutes)),
    [start, setStart] = useState(timeOf(profile.dayStartHour * 60)),
    [end, setEnd] = useState(timeOf(profile.dayEndHour * 60)),
    [search, setSearch] = useState("");
  const zones = [
    ...new Set([
      "UTC",
      profile.timezone,
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  ]
    .sort()
    .filter((zone) =>
      zone.toLowerCase().replace(/_/g, " ").includes(search.toLowerCase()),
    );
  return (
    <div className={s.planning}>
      <PropertyList
        open={open}
        setOpen={setOpen}
        rows={[
          {
            id: "capacity",
            label: "Daily capacity",
            value: (
              <>
                {formatMinutes(profile.dailyCapacityMinutes)}{" "}
                <SaveFeedback state={action.feedback.capacity} />
              </>
            ),
            editor: (
              <>
                <div className={shared.chips}>
                  {[4, 5, 6, 7, 8].map((hours) => (
                    <button
                      type="button"
                      key={hours}
                      className={`${shared.chip} ${profile.dailyCapacityMinutes === hours * 60 ? shared.chipOn : ""}`}
                      aria-pressed={profile.dailyCapacityMinutes === hours * 60}
                      onClick={() => {
                        setCapacity(String(hours * 60));
                        void action.run("capacity", () =>
                          update({
                            patch: { dailyCapacityMinutes: hours * 60 },
                          }),
                        );
                      }}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
                <label className={shared.field}>
                  <span className={shared.label}>Custom minutes</span>
                  <input
                    type="number"
                    aria-label="Custom capacity in minutes"
                    min={1}
                    max={1440}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    onBlur={() =>
                      void action.run("capacity", () =>
                        update({
                          patch: { dailyCapacityMinutes: Number(capacity) },
                        }),
                      )
                    }
                  />
                </label>
                <p>
                  A day with more planned than this is marked as over capacity.
                </p>
                <SaveFeedback state={action.feedback.capacity} />
              </>
            ),
          },
          {
            id: "start",
            label: "Day starts",
            value: (
              <>
                {timeValue(timeOf(profile.dayStartHour * 60), null)}{" "}
                <SaveFeedback state={action.feedback.start} />
              </>
            ),
            editor: (
              <>
                <TimeField
                  label="Day starts"
                  value={start}
                  change={setStart}
                  required
                  save={(value) =>
                    void action.run("start", () =>
                      update({
                        patch: { dayStartHour: minutesOf(value) / 60 },
                      }),
                    )
                  }
                />
                <SaveFeedback state={action.feedback.start} />
              </>
            ),
          },
          {
            id: "end",
            label: "Day ends",
            value: (
              <>
                {timeValue(timeOf(profile.dayEndHour * 60), null)}{" "}
                <SaveFeedback state={action.feedback.end} />
              </>
            ),
            editor: (
              <>
                <TimeField
                  label="Day ends"
                  value={end}
                  change={setEnd}
                  required
                  save={(value) =>
                    void action.run("end", () =>
                      update({ patch: { dayEndHour: minutesOf(value) / 60 } }),
                    )
                  }
                />
                <SaveFeedback state={action.feedback.end} />
              </>
            ),
          },
          {
            id: "timezone",
            label: "Timezone",
            value: (
              <>
                {timezoneValue(profile.timezone)}{" "}
                <SaveFeedback state={action.feedback.timezone} />
              </>
            ),
            editor: (
              <>
                <input
                  aria-label="Search timezones"
                  type="search"
                  placeholder="Search cities or timezones"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className={s.zones} role="group" aria-label="Timezones">
                  {zones.map((zone) => (
                    <button
                      type="button"
                      key={zone}
                      aria-pressed={zone === profile.timezone}
                      onClick={() =>
                        void action.run("timezone", () =>
                          update({ patch: { timezone: zone } }),
                        )
                      }
                    >
                      {timezoneValue(zone)}
                    </button>
                  ))}
                  {!zones.length && (
                    <p>No timezones match. Try a city such as New York.</p>
                  )}
                </div>
                <SaveFeedback state={action.feedback.timezone} />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
