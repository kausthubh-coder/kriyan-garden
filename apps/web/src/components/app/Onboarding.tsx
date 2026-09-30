"use client";
import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import {
  addDays,
  getWeekday,
  lengthValue,
  longDate,
  parseTimeInput,
  relativeDay,
  timeValue,
  weekdayName,
  type QuickAddResult,
} from "@kriyan/core";
import { AreasRows, ProjectsRows, EventsRows } from "./SetupEditors";
import { OnboardingGoal } from "./OnboardingGoal";
import { QuickAdd } from "./QuickAdd";
import { Timeline } from "./Timeline";
import { Filters } from "./Filters";
import { GoalsView } from "./GoalsView";
import { EditableRow } from "./EditableRow";
import { SaveFeedback, SetupSaveContext, useInlineSave, useSetupDraft } from "./useInlineSave";
import {
  areaColor,
  type Area,
  type Project,
  type Goal,
  type Profile,
  type Task,
  type Variables,
  type Day,
} from "./types";
import s from "./Onboarding.module.css";

const headings = [
  "What do you plan for?",
  "What are you working on?",
  "Anything fixed each week?",
  "What are you aiming for?",
  "What is on your mind?",
];
const descriptions = [
  "Kriyan sorts everything into areas. Start with these three, rename them, or add your own.",
  "Add a project or course under each area. You can add more later in settings.",
  "Add classes and standing meetings so you can plan around them. You can skip this and add them later.",
  "Choose one goal and a target. Tasks, a number or milestones can measure your progress.",
  "Type a task the way you would say it and press Enter. A day, a time and a length are all optional.",
];
const noop = () => {};
export function Onboarding({
  areas,
  projects,
  events,
  goals = [],
  tasks = [],
  profile,
  today,
  now = 0,
  loading = false,
  error,
  retry,
  finish,
}: {
  areas: Area[];
  projects: Project[];
  events: Doc<"events">[];
  goals?: Goal[];
  tasks?: Task[];
  profile?: Profile;
  today: string;
  now?: number;
  loading?: boolean;
  error?: string;
  retry?: () => void;
  finish: () => void;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    clerk = useClerk();
  const rawStep = Number(params.get("step") ?? profile?.onboardingStep ?? 1);
  const step =
    Number.isInteger(rawStep) && rawStep >= 1 && rawStep <= 5 ? rawStep : 1;
  const complete = useMutation(api.profiles.completeOnboarding),
    sample = useMutation(api.profiles.seedSample),
    saveStep = useMutation(api.profiles.saveOnboarding),
    createTask = useMutation(api.tasks.create),
    removeTask = useMutation(api.tasks.remove);
  const action = useInlineSave();
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingSaves = useRef(new Set<Promise<boolean>>());
  function registerSave(promise: Promise<boolean>) {
    pendingSaves.current.add(promise);
    void promise.then(() => pendingSaves.current.delete(promise));
  }
  const [confirmSample, setConfirmSample] = useState(false),
    [names, setNames] = useState<Record<string, string>>({}),
    [projectDrafts, setProjectDrafts] = useState<Record<string, string>>({}),
    [eventDraft, setEventDraft] = useState<Record<string, string>>({}),
    [goalPreview, setGoalPreview] = useState<Goal>();
  const draft = useSetupDraft("tasks", { text: "" }, profile);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  async function go(next: number) {
    if (loading || action.feedback.step?.busy) return;
    const saved = await Promise.all([draft.pending.current, ...pendingSaves.current]);
    if (saved.some((success) => !success)) return;
    if (next > 5) {
      if (await action.run("step", () => complete({}))) finish();
      return;
    }
    if (await action.run("step", () => saveStep({ step: next })))
      router.push(`/app/welcome?step=${next}`, { scroll: false });
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft" && step > 1) {
        e.preventDefault();
        void go(step - 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const displayAreas = areas.map((a) =>
    names[a._id] !== undefined ? { ...a, name: names[a._id] } : a,
  );
  const typedStart = parseTimeInput(eventDraft.start ?? ""),
    typedEnd = parseTimeInput(eventDraft.end ?? "");
  const previewEvents = [...events];
  if (
    eventDraft.title?.trim() &&
    typedStart &&
    typedEnd &&
    typedEnd > typedStart &&
    eventDraft.days
  )
    previewEvents.push({
      _id: "preview-event" as Id<"events">,
      _creationTime: 0,
      ownerId: profile?.ownerId ?? "preview",
      createdAt: 0,
      updatedAt: 0,
      title: eventDraft.title,
      location: eventDraft.location ?? "",
      areaId: eventDraft.area as Id<"areas">,
      weekdays: eventDraft.days.split(",").map(Number),
      startTime: typedStart,
      endTime: typedEnd,
      fromDate: eventDraft.from ?? today,
      untilDate: eventDraft.until || null,
    });
  const previewDate =
    step === 3
      ? (Array.from({ length: 8 }, (_, i) => addDays(today, i)).find((date) =>
          previewEvents.some(
            (e) =>
              e.fromDate <= date &&
              (!e.untilDate || date <= e.untilDate) &&
              e.weekdays.includes(getWeekday(date)),
          ),
        ) ?? today)
      : today;
  const todayTasks =
    step === 5 ? tasks.filter((t) => t.date === today || t.date === null) : [];
  const day: Day = {
    date: previewDate,
    timed: todayTasks.filter((t) => !!t.time),
    anytime: todayTasks.filter((t) => !t.time),
    unscheduled: [],
    events:
      step >= 3
        ? previewEvents.filter(
            (e) =>
              e.fromDate <= previewDate &&
              (!e.untilDate || previewDate <= e.untilDate) &&
              e.weekdays.includes(getWeekday(previewDate)),
          )
        : [],
    plannedMinutes: 0,
    countWithoutDuration: 0,
  };
  const previewGoals = goalPreview ? [goalPreview] : goals.slice(0, 1);
  async function addTask(result: QuickAddResult) {
    if (
      await action.run("task", () =>
        createTask({
          ...result,
          areaId: result.areaId as Id<"areas">,
          projectId: result.projectId as Id<"projects"> | null,
          date: result.date ?? today,
        }),
      )
    )
      draft.change({ text: "" });
  }
  const hasAnswers =
    tasks.length ||
    projects.length ||
    events.length ||
    goals.length ||
    areas.length !== 3 ||
    areas.some(
      (a, i) =>
        a.name !== ["School", "Business", "Life"][i] ||
        a.color !== ["blue", "orange", "green"][i],
    );
  async function loadSample(replace = false) {
    await Promise.all([draft.pending.current, ...pendingSaves.current]);
    if (
      await action.run("sample", () =>
        sample({ today, ...(replace ? { replace: true } : {}) }),
      )
    )
      finish();
  }
  return (
    <main className={s.frame} aria-busy={loading} data-onboarding-step={step}>
      <header className={s.top}>
        <b className={s.wordmark}>kriyan</b>
        <div className={s.topActions}>
          <button
            className={s.textButton}
            disabled={loading || action.feedback.sample?.busy}
            onClick={() =>
              hasAnswers ? setConfirmSample(true) : void loadSample()
            }
          >
            Use sample data
          </button>
          <button
            className={s.textButton}
            onClick={() => void clerk.signOut({ redirectUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      </header>
      <SetupSaveContext.Provider value={registerSave}><div className={s.main}>
        <section className={s.question} aria-labelledby="setup-heading">
          <p className={s.step} role="status" aria-live="polite">
            Step {step} of 5
          </p>
          <h1 id="setup-heading" tabIndex={-1} ref={heading}>
            {headings[step - 1]}
          </h1>
          <p className={s.description}>{descriptions[step - 1]}</p>
          {loading ? (
            <div className={s.answers} aria-label="Loading setup">
              <div className={s.skeleton} />
              <div className={s.skeleton} />
              <div className={s.skeleton} />
            </div>
          ) : (
            <>
              {step === 1 && (
                <AreasRows
                  areas={areas}
                  onboarding
                  onNames={(id, name) =>
                    setNames((old) => ({ ...old, [id]: name }))
                  }
                />
              )}
              {step === 2 && (
                <ProjectsRows
                  areas={areas}
                  projects={projects}
                  profile={profile}
                  advance={() => void go(3)}
                  preview={(id, name) =>
                    setProjectDrafts((old) => ({ ...old, [id]: name }))
                  }
                />
              )}
              {step === 3 && (
                <EventsRows
                  areas={areas}
                  events={events}
                  today={today}
                  profile={profile}
                  onDraft={setEventDraft}
                />
              )}
              {step === 4 && profile && (
                <OnboardingGoal
                  areas={areas}
                  goal={goals[0]}
                  profile={profile}
                  today={today}
                  preview={setGoalPreview}
                  advance={() => void go(5)}
                />
              )}
              {step === 5 && (
                <div className={s.answers}>
                  <div className={s.quickAdd}>
                    <QuickAdd
                      inline
                      inputText={draft.values.text}
                      changeText={(text) => draft.change({ text })}
                      context={{
                        today,
                        defaultDate: today,
                        defaultAreaId:
                          areas.find((a) => a.color === "green")?._id ??
                          areas[0]?._id ??
                          "",
                        areas: areas.map((a) => ({ id: a._id, name: a.name })),
                        projects: projects.map((p) => ({
                          id: p._id,
                          name: p.name,
                          areaId: p.areaId,
                        })),
                      }}
                      areas={areas}
                      projects={projects}
                      close={noop}
                      submit={(result) => void addTask(result)}
                      emptyEnter={() => void go(6)}
                    />
                  </div>
                  <div className={s.try}>
                    Try{" "}
                    {["gym tomorrow 7am", "essay fri 5pm 2h", "call amma"].map(
                      (text) => (
                        <button
                          className={s.chip}
                          key={text}
                          onClick={() => draft.change({ text })}
                        >
                          {text}
                        </button>
                      ),
                    )}
                  </div>
                  {tasks.map((task) => (
                    <div key={task._id}>
                      <EditableRow
                        title={task.title}
                        leading={
                          <i
                            className={s.check}
                            style={
                              {
                                "--c": areaColor(
                                  areas.find((a) => a._id === task.areaId),
                                ),
                              } as Variables
                            }
                          />
                        }
                        summary={[
                          task.date
                            ? relativeDay(task.date, today)
                            : "Any time today",
                          task.time ? timeValue(task.time, null) : null,
                          task.durationMinutes
                            ? lengthValue(task.durationMinutes)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        remove={() =>
                          void action.run(task._id, () =>
                            removeTask({ id: task._id }),
                          )
                        }
                      />
                      <SaveFeedback state={action.feedback[task._id]} />
                    </div>
                  ))}
                  <SaveFeedback state={action.feedback.task} />
                  <SaveFeedback state={draft.feedback} />
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className={`${s.feedback} ${s.error}`}>
              {error}
              <button className={s.textButton} onClick={retry}>
                Retry loading
              </button>
            </p>
          )}
          <SaveFeedback state={action.feedback.step} />
          <SaveFeedback state={action.feedback.sample} />
          {confirmSample && (
            <div
              className={s.confirm}
              role="alertdialog"
              aria-label="Replace with sample data"
            >
              <p>Replace what you have entered with sample data?</p>
              <button
                className={s.primary}
                disabled={action.feedback.sample?.busy}
                onClick={() => void loadSample(true)}
              >
                Replace
              </button>
              <button
                className={s.textButton}
                onClick={() => setConfirmSample(false)}
              >
                Keep mine
              </button>
            </div>
          )}
          <footer className={s.footer}>
            <button
              className={s.primary}
              disabled={loading || !areas.length || action.feedback.step?.busy}
              onClick={() => void go(step + 1)}
            >
              {step === 5 ? "Open my planner" : "Continue"}
            </button>
            {step > 1 && (
              <button
                className={s.textButton}
                disabled={loading || action.feedback.step?.busy}
                onClick={() => void go(step - 1)}
              >
                Back
              </button>
            )}
            {step > 1 && step < 5 && (
              <button
                className={`${s.textButton} ${s.skip}`}
                disabled={loading || action.feedback.step?.busy}
                onClick={() => void go(step + 1)}
              >
                Skip
              </button>
            )}
          </footer>
        </section>
        <aside className={s.preview} aria-hidden="true" inert>
          <p className={s.caption}>
            {step === 3
              ? `${weekdayName(previewDate)}, with your classes on the timeline`
              : step === 5
                ? "Today"
                : step === 4
                  ? "Your goal and its pace"
                  : "Your planner so far"}
          </p>
          <div
            className={`${s.previewInner} ${step === 4 ? s.goalPreview : ""}`}
          >
            {step === 2 ? (
              displayAreas.map((a) => (
                <div key={a._id}>
                  <h3 className={s.group}>
                    <i
                      className={s.dot}
                      style={{ "--c": areaColor(a) } as Variables}
                    />
                    {a.name}
                  </h3>
                  <div className={s.previewList}>
                    {projects
                      .filter((p) => p.areaId === a._id)
                      .map((p) => (
                        <p key={p._id}>{p.name}</p>
                      ))}
                    {(projectDrafts[a._id] ??
                      profile?.onboardingDraft?.[`project.${a._id}.name`]) && (
                      <p>
                        {projectDrafts[a._id] ??
                          profile?.onboardingDraft?.[`project.${a._id}.name`]}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : step === 4 ? (
              <GoalsView
                areas={displayAreas}
                projects={projects}
                goals={previewGoals}
                tasks={[]}
                date={today}
                today={today}
                filter="all"
                loading={loading}
                setFilter={noop}
                open={noop}
                toggle={noop}
                add={noop}
                navigate={noop}
                openGoal={noop}
              />
            ) : (
              <>
                {step === 1 && (
                  <>
                    <div className={s.previewHeader}>
                      <h2>{weekdayName(today)}</h2>
                      <p>{longDate(today)}</p>
                    </div>
                    <Filters
                      areas={displayAreas}
                      filter="all"
                      onChange={noop}
                    />
                  </>
                )}
                {step === 5 && day.anytime.length > 0 && (
                  <>
                    <h3 className={s.group}>Any time today</h3>
                    <div className={s.previewList}>
                      {day.anytime.map((t) => (
                        <p key={t._id}>{t.title}</p>
                      ))}
                    </div>
                  </>
                )}
                <Timeline
                  day={day}
                  static
                  startHour={Math.min(
                    9,
                    ...(step === 1 ? [Math.floor(now / 60)] : []),
                    ...day.events.map((e) => Number(e.startTime.slice(0, 2))),
                    ...day.timed.map((t) => Number(t.time?.slice(0, 2))),
                  )}
                  endHour={Math.max(
                    17,
                    ...(step === 1 ? [Math.ceil(now / 60)] : []),
                    ...day.events.map((e) =>
                      Math.ceil(
                        Number(e.endTime.slice(0, 2)) +
                          Number(e.endTime.slice(3)) / 60,
                      ),
                    ),
                    ...day.timed.map((t) =>
                      Math.ceil(
                        Number(t.time?.slice(0, 2)) +
                          (t.durationMinutes ?? 0) / 60,
                      ),
                    ),
                  )}
                  date={previewDate}
                  today={today}
                  now={now}
                  areas={displayAreas}
                  projects={projects}
                  goals={goals}
                  open={noop}
                  toggle={noop}
                  loading={loading}
                />
              </>
            )}
          </div>
        </aside>
      </div></SetupSaveContext.Provider>
    </main>
  );
}
