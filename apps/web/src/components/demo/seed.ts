import { addDays, getWeekday } from "@kriyan/core";
import type { Doc, Id } from "@kriyan/backend/convex/_generated/dataModel";
import type { Area, Goal, Profile, Project, Task } from "../app/types";
export const id = <T extends "tasks" | "areas" | "projects" | "goals" | "events" | "profiles" | "milestones">(value: string) => value as Id<T>;
export function seed(today: string) {
  const common = { ownerId: "public-demo", createdAt: 0, updatedAt: 0, _creationTime: 0 };
  const areas: Area[] = [
    { ...common, _id: id<"areas">("school"), name: "School", color: "blue", sortOrder: 0 },
    { ...common, _id: id<"areas">("biz"), name: "Business", color: "orange", sortOrder: 1 },
    { ...common, _id: id<"areas">("life"), name: "Life", color: "green", sortOrder: 2 },
  ];
  const projects: Project[] = [
    ["cs201", "CS 201", "school"], ["calc", "Calculus II", "school"], ["econ", "Econ 101", "school"],
    ["launch", "Kriyan mobile launch", "biz"], ["hartley", "Hartley website", "biz"],
    ["health", "Health", "life"], ["home", "Home and family", "life"],
  ].map(([key, name, area], index) => ({ ...common, _id: id<"projects">(key), areaId: id<"areas">(area), name, kind: area === "school" ? "course" : "project", note: "", sortOrder: index, archivedAt: null }));
  const profile: Profile = { ...common, _id: id<"profiles">("demo-profile"), onboardingComplete: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, dailyCapacityMinutes: 360, dayStartHour: 7, dayEndHour: 23 };
  let counter = 0;
  const task = (title: string, area: string, project: string | null, off: number | null, time: string | null, dur: number | null, extra: { done?: boolean; goal?: string; due?: string } = {}): Task => ({
    ...common, _id: id<"tasks">(`demo-${counter++}`), title, areaId: id<"areas">(area), projectId: project ? id<"projects">(project) : null, goalId: extra.goal ? id<"goals">(extra.goal) : null,
    date: off === null ? null : addDays(today, off), time, durationMinutes: dur, deadline: extra.due ?? null, repeat: null, reminders: [], notes: "", sortOrder: counter,
    status: extra.done ? "completed" : "active", completedAt: extra.done ? 0 : null, searchText: title.toLowerCase(),
  });
  const tasks: Task[] = [
task("Gym, legs", "life", "health", 0, "08:00", 45, { done: true, goal: "run" }),
task("Read chapter 6, hash tables", "school", "cs201", 0, null, 30, { done: true }),
task("Problem set 4, linked lists", "school", "cs201", 0, "11:30", 60, { due: addDays(today, 2) }),
task("Ship the update_task signing fix", "biz", "launch", 0, "14:30", 60, { goal: "launch" }),
task("Send the September invoice to Hartley", "biz", "hartley", 0, "16:00", null),
task("Call Amma", "life", "home", 0, null, null),
task("Reply to Priya about the launch deck", "biz", "launch", 0, null, 30),
task("Midterm revision, integration by parts", "school", "calc", 0, "19:00", 75, { goal: "gpa" }),
task("Read for 20 minutes", "life", null, 0, "21:00", 20),
task("Econ essay outline", "school", "econ", null, null, 45, { due: addDays(today, 3) }),
task("Record the product walkthrough", "biz", "launch", null, null, null, { goal: "launch" }),
task("Renew passport", "life", "home", null, null, null),
task("Calculus problem sheet 5", "school", "calc", 1, "10:00", 90, { goal: "gpa" }),
task("Design the onboarding screens", "biz", "launch", 1, "15:00", 120, { goal: "launch" }),
task("Buy groceries", "life", "home", 1, null, null),
task("Finish problem set 4", "school", "cs201", 2, "09:00", 60, { due: addDays(today, 2) }),
task("Set up Expo sign in", "biz", "launch", 2, "13:00", 180, { goal: "launch" }),
task("Midterm revision, series", "school", "calc", 2, "17:00", 120, { goal: "gpa" }),
task("Long run, 7 km", "life", "health", 2, "07:30", 50, { goal: "run" }),
task("Write the econ essay outline", "school", "econ", 3, "16:00", 45),
task("Send Hartley the staging link", "biz", "hartley", 3, null, null),
task("Easy run, 4 km", "life", "health", 4, "09:00", 30, { goal: "run" }),
task("Plan next week", "life", null, 5, "18:00", null),
task("Stand-up notes", "biz", "launch", -1, "09:30", 15, { done: true }),
task("Calculus lecture notes", "school", "calc", -1, null, 40, { done: true }),
  ];
  // Prototype task tuples are inserted here, with dates relative to the visitor.
  const goals: Goal[] = [
    { key: "launch", area: "biz", title: "Launch Kriyan on mobile", current: 42, target: 100, unit: "%", elapsed: 48, remaining: 52 },
    { key: "gpa", area: "school", title: "3.8 GPA this semester", current: 3.74, target: 3.8, unit: "GPA", elapsed: 60, remaining: 40 },
    { key: "run", area: "life", title: "Run a 10k", current: 6.5, target: 10, unit: "km", elapsed: 58, remaining: 42 },
  ].map((g, index) => ({ ...common, _id: id<"goals">(g.key), areaId: id<"areas">(g.area), title: g.title, note: "Sample goal", startDate: addDays(today, -g.elapsed), targetDate: addDays(today, g.remaining), metric: { kind: "number", current: g.current, target: g.target, unit: g.unit }, status: "active", sortOrder: index, linkedTasks: { total: 0, done: 0 }, milestones: [] }));
  const eventData: [string, string, string, number, string, string][] = [
    ["CS 201 lecture", "school", "Room 4.12", 0, "10:00", "11:15"],
    ["Calculus II lecture", "school", "Hall B", 0, "13:00", "13:50"],
    ["Econ 101 seminar", "school", "Room 2.03", 1, "11:30", "12:45"],
    ["CS 201 lecture", "school", "Room 4.12", 2, "10:00", "11:15"],
    ["Calculus II lecture", "school", "Hall B", 2, "13:00", "13:50"],
    ["Call with Hartley", "biz", "Video call", 3, "14:00", "14:30"],
    ["Calculus II lecture", "school", "Hall B", -1, "13:00", "13:50"],
  ];
  const events: Doc<"events">[] = eventData.map(([title, area, location, offset, startTime, endTime], index) => {
    const date = addDays(today, offset);
    return { ...common, _id: id<"events">(`event-${index}`), title, areaId: id<"areas">(area), location, weekdays: [getWeekday(date)], startTime, endTime, fromDate: date, untilDate: date };
  });
  return { areas, projects, profile, tasks, goals, events };
}
