import { v } from "convex/values";

export const horizonValidator = v.union(
  v.literal("now"),
  v.literal("season"),
  v.literal("someday"),
);

export const taskStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
);

export const regionDtoValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
  note: v.string(),
  sortOrder: v.number(),
});

export const taskDtoValidator = v.object({
  id: v.string(),
  title: v.string(),
  regionId: v.union(v.string(), v.null()),
  horizon: horizonValidator,
  dueDate: v.union(v.string(), v.null()),
  time: v.union(v.string(), v.null()),
  durationMinutes: v.union(v.number(), v.null()),
  repeatRule: v.union(v.string(), v.null()),
  reminders: v.array(v.string()),
  content: v.string(),
  status: taskStatusValidator,
  completedAt: v.union(v.string(), v.null()),
  sortOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const gardenDataValidator = v.object({
  regions: v.array(regionDtoValidator),
  tasks: v.array(taskDtoValidator),
  onboardingComplete: v.boolean(),
});

export const nullableStringValidator = v.union(v.string(), v.null());
export const nullableNumberValidator = v.union(v.number(), v.null());

export const taskFieldsValidator = {
  title: v.string(),
  regionId: v.union(v.id("regions"), v.null()),
  dueDate: nullableStringValidator,
  time: nullableStringValidator,
  durationMinutes: nullableNumberValidator,
  repeatRule: nullableStringValidator,
  reminders: v.array(v.string()),
  content: v.string(),
};

export const taskPatchValidator = v.object({
  title: v.optional(v.string()),
  regionId: v.optional(v.union(v.id("regions"), v.null())),
  dueDate: v.optional(nullableStringValidator),
  time: v.optional(nullableStringValidator),
  durationMinutes: v.optional(nullableNumberValidator),
  repeatRule: v.optional(nullableStringValidator),
  reminders: v.optional(v.array(v.string())),
  content: v.optional(v.string()),
});
