import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    ownerId: v.string(),
    onboardingComplete: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_owner_id", ["ownerId"]),

  regions: defineTable({
    ownerId: v.string(),
    name: v.string(),
    color: v.string(),
    note: v.string(),
    sortOrder: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_owner_id_and_sort_order", ["ownerId", "sortOrder"]),

  tasks: defineTable({
    ownerId: v.string(),
    title: v.string(),
    regionId: v.union(v.id("regions"), v.null()),
    dueDate: v.union(v.string(), v.null()),
    time: v.union(v.string(), v.null()),
    durationMinutes: v.union(v.number(), v.null()),
    repeatRule: v.union(v.string(), v.null()),
    reminders: v.array(v.string()),
    content: v.string(),
    status: v.union(v.literal("active"), v.literal("completed")),
    completedAt: v.union(v.string(), v.null()),
    sortOrder: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
    searchText: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_owner_id_and_sort_order", ["ownerId", "sortOrder"])
    .index("by_owner_id_and_status", ["ownerId", "status"])
    .index("by_owner_id_and_region_id", ["ownerId", "regionId"])
    .index("by_owner_id_and_due_date", ["ownerId", "dueDate"])
    .index("by_owner_id_and_updated_at", ["ownerId", "updatedAt"])
    .searchIndex("search_notes", {
      searchField: "searchText",
      filterFields: ["ownerId", "status"],
    }),
});
