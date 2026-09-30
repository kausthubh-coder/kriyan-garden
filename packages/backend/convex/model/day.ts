import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { date } from "./shared";

import { assemble } from "./assemble";
export { assemble } from "./assemble";
export async function get(ctx: QueryCtx, ownerId: string, args: { date: string }) {
  const day = date(args.date);
  const [tasks, events, undated] = await Promise.all([
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", day)).take(10000),
    ctx.db.query("events").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(100),
    ctx.db.query("tasks").withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId).eq("date", null)).take(10000),
  ]);
  return assemble(day, tasks, events, undated.filter((task) => task.status === "active"));
}
