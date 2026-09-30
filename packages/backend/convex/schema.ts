import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import * as V from "./validators";

export default defineSchema({
  profiles: defineTable({ ...V.common, ...V.profileFields }).index("by_owner", ["ownerId"]),
  areas: defineTable({ ...V.common, ...V.areaFields }).index("by_owner", ["ownerId"]).index("by_owner_sort", ["ownerId", "sortOrder"]),
  projects: defineTable({ ...V.common, ...V.projectFields }).index("by_owner", ["ownerId"]).index("by_owner_area", ["ownerId", "areaId"]),
  goals: defineTable({ ...V.common, ...V.goalFields }).index("by_owner", ["ownerId"]).index("by_owner_area", ["ownerId", "areaId"]).index("by_owner_status", ["ownerId", "status"]),
  milestones: defineTable({ ...V.common, ...V.milestoneFields }).index("by_owner", ["ownerId"]).index("by_owner_goal", ["ownerId", "goalId"]),
  events: defineTable({ ...V.common, ...V.eventFields }).index("by_owner", ["ownerId"]),
  tasks: defineTable({ ...V.common, ...V.taskFields, status: V.taskStatus, completedAt: V.nullableNumber, searchText: V.task.fields.searchText })
    .index("by_owner", ["ownerId"]).index("by_owner_date", ["ownerId", "date"]).index("by_owner_status", ["ownerId", "status"])
    .index("by_owner_project", ["ownerId", "projectId"]).index("by_owner_goal", ["ownerId", "goalId"]).index("by_owner_deadline", ["ownerId", "deadline"]).index("by_owner_area", ["ownerId", "areaId"])
    .searchIndex("search", { searchField: "searchText", filterFields: ["ownerId", "status"] }),
  habits: defineTable({ ...V.common, ...V.habitFields }).index("by_owner", ["ownerId"]),
  habitLogs: defineTable({ ...V.common, ...V.habitLogFields }).index("by_owner_habit", ["ownerId", "habitId"]).index("by_owner_date", ["ownerId", "date"]).index("by_owner", ["ownerId"]),
  // Global replay guards use the nonce indexes explicitly required by the brief.
  serviceNonces: defineTable({ ...V.common, ...V.nonceFields }).index("by_nonce", ["nonce"]).index("by_expires", ["expiresAt"]).index("by_owner", ["ownerId"]),
  serviceInvocations: defineTable({ ...V.common, requestId: v.string(), kind: v.union(v.literal("read"), v.literal("write")), expiresAt: v.number() }).index("by_owner_request", ["ownerId", "requestId"]).index("by_expires", ["expiresAt"]),
});
