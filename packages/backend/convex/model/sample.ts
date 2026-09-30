import { addDays, getWeekday } from "@kriyan/core";
import type { MutationCtx } from "../_generated/server";
import { date } from "./shared";
import * as profiles from "./profiles";
import * as areas from "./areas";
import * as projects from "./projects";
import * as goals from "./goals";
import * as tasks from "./tasks";
import * as events from "./events";

// The approved app.js rows, with dates relative to the user's supplied today.
const taskRows: readonly [
  string,
  "school" | "biz" | "life",
  string | null,
  number | null,
  string | null,
  number | null,
  boolean?,
  string?,
  number?,
][] = [
  ["Gym, legs", "life", "health", 0, "08:00", 45, true, "run"],
  ["Read chapter 6, hash tables", "school", "cs201", 0, null, 30, true],
  [
    "Problem set 4, linked lists",
    "school",
    "cs201",
    0,
    "11:30",
    60,
    false,
    undefined,
    2,
  ],
  [
    "Ship the update_task signing fix",
    "biz",
    "launch",
    0,
    "14:30",
    60,
    false,
    "launch",
  ],
  ["Send the September invoice to Hartley", "biz", "hartley", 0, "16:00", null],
  ["Call Amma", "life", "home", 0, null, null],
  ["Reply to Priya about the launch deck", "biz", "launch", 0, null, 30],
  [
    "Midterm revision, integration by parts",
    "school",
    "calc",
    0,
    "19:00",
    75,
    false,
    "gpa",
  ],
  ["Read for 20 minutes", "life", null, 0, "21:00", 20],
  ["Econ essay outline", "school", "econ", null, null, 45, false, undefined, 3],
  [
    "Record the product walkthrough",
    "biz",
    "launch",
    null,
    null,
    null,
    false,
    "launch",
  ],
  ["Renew passport", "life", "home", null, null, null],
  ["Calculus problem sheet 5", "school", "calc", 1, "10:00", 90, false, "gpa"],
  [
    "Design the onboarding screens",
    "biz",
    "launch",
    1,
    "15:00",
    120,
    false,
    "launch",
  ],
  ["Buy groceries", "life", "home", 1, null, null],
  [
    "Finish problem set 4",
    "school",
    "cs201",
    2,
    "09:00",
    60,
    false,
    undefined,
    2,
  ],
  ["Set up Expo sign in", "biz", "launch", 2, "13:00", 180, false, "launch"],
  ["Midterm revision, series", "school", "calc", 2, "17:00", 120, false, "gpa"],
  ["Long run, 7 km", "life", "health", 2, "07:30", 50, false, "run"],
  ["Write the econ essay outline", "school", "econ", 3, "16:00", 45],
  ["Send Hartley the staging link", "biz", "hartley", 3, null, null],
  ["Easy run, 4 km", "life", "health", 4, "09:00", 30, false, "run"],
  ["Plan next week", "life", null, 5, "18:00", null],
  ["Stand-up notes", "biz", "launch", -1, "09:30", 15, true],
  ["Calculus lecture notes", "school", "calc", -1, null, 40, true],
];
export async function seedSample(
  ctx: MutationCtx,
  ownerId: string,
  args: { today: string },
) {
  const today = date(args.today),
    profile = await profiles.ensure(ctx, ownerId, {});
  if (profile.onboardingComplete) return profile;
  for (const table of [
    "tasks",
    "projects",
    "goals",
    "events",
    "habits",
  ] as const) {
    if (
      await ctx.db
        .query(table)
        .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
        .first()
    )
      throw new Error(
        "Your planner already has records. Finish setup to keep them, or reset everything in settings before exploring sample data.",
      );
  }
  const defaults = await areas.list(ctx, ownerId);
  const school = defaults.find((a) => a.name === "School"),
    biz = defaults.find((a) => a.name === "Business"),
    life = defaults.find((a) => a.name === "Life");
  if (!school || !biz || !life)
    throw new Error(
      "Sample data needs the School, Business and Life areas. Restore those names and try again.",
    );
  const area = { school: school._id, biz: biz._id, life: life._id };
  const projectRows = [
    ["cs201", "CS 201", "school"],
    ["calc", "Calculus II", "school"],
    ["econ", "Econ 101", "school"],
    ["launch", "Kriyan mobile launch", "biz"],
    ["hartley", "Hartley website", "biz"],
    ["health", "Health", "life"],
    ["home", "Home and family", "life"],
  ] as const;
  const projectMap = new Map<
    string,
    Awaited<ReturnType<typeof projects.create>>["_id"]
  >();
  for (const [key, name, parent] of projectRows)
    projectMap.set(
      key,
      (
        await projects.create(ctx, ownerId, {
          name,
          areaId: area[parent],
          kind: parent === "school" ? "course" : "project",
        })
      )._id,
    );
  // Prototype progress is decorative. Store actual number metrics; pace is computed.
  const goalMap = new Map<
    string,
    Awaited<ReturnType<typeof goals.create>>["_id"]
  >();
  for (const [
    key,
    parent,
    title,
    current,
    target,
    unit,
    elapsed,
    remaining,
  ] of [
    ["launch", "biz", "Launch Kriyan on mobile", 42, 100, "%", 71, 77],
    ["gpa", "school", "3.8 GPA this semester", 3.74, 3.8, "GPA", 120, 80],
    ["run", "life", "Run a 10k", 6.5, 10, "km", 75, 54],
  ] as const)
    goalMap.set(
      key,
      (
        await goals.create(ctx, ownerId, {
          title,
          areaId: area[parent],
          startDate: addDays(today, -elapsed),
          targetDate: addDays(today, remaining),
          metric: { kind: "number", current, target, unit },
        })
      )._id,
    );
  for (const [
    title,
    parent,
    project,
    offset,
    time,
    durationMinutes,
    done,
    goal,
    deadline,
  ] of taskRows) {
    const task = await tasks.create(ctx, ownerId, {
      title,
      areaId: area[parent],
      projectId: project ? (projectMap.get(project) ?? null) : null,
      goalId: goal ? (goalMap.get(goal) ?? null) : null,
      date: offset === null ? null : addDays(today, offset),
      time,
      durationMinutes,
      deadline: deadline === undefined ? null : addDays(today, deadline),
    });
    if (done) await tasks.complete(ctx, ownerId, { id: task._id });
  }
  for (const [title, parent, location, offset, startTime, endTime] of [
    ["CS 201 lecture", "school", "Room 4.12", 0, "10:00", "11:15"],
    ["Calculus II lecture", "school", "Hall B", 0, "13:00", "13:50"],
    ["Econ 101 seminar", "school", "Room 2.03", 1, "11:30", "12:45"],
    ["CS 201 lecture", "school", "Room 4.12", 2, "10:00", "11:15"],
    ["Calculus II lecture", "school", "Hall B", 2, "13:00", "13:50"],
    ["Call with Hartley", "biz", "Video call", 3, "14:00", "14:30"],
    ["Calculus II lecture", "school", "Hall B", -1, "13:00", "13:50"],
  ] as const) {
    const eventDate = addDays(today, offset);
    await events.create(ctx, ownerId, {
      title,
      areaId: area[parent],
      location,
      weekdays: [getWeekday(eventDate)],
      startTime,
      endTime,
      fromDate: eventDate,
      untilDate: eventDate,
    });
  }
  return profiles.completeOnboarding(ctx, ownerId, {});
}
