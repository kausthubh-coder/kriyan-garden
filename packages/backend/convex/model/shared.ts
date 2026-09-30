import type { Doc, Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { addDays } from "@kriyan/core";

export async function requireOwnerId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated. Sign in and try again.");
  return identity.subject;
}
export async function owned<T extends TableNames>(ctx: QueryCtx, ownerId: string, id: Id<T>): Promise<Doc<T>> {
  const row = await ctx.db.get(id);
  if (!row || row.ownerId !== ownerId) throw new Error("Record not found. Check the ID and try again.");
  return row;
}
export const stamps = (ownerId: string) => ({ ownerId, createdAt: Date.now(), updatedAt: Date.now() });
export function text(value: string, maximum: number, required = false) {
  const result = value.trim().slice(0, maximum);
  if (required && !result) throw new Error("A name or title is required. Enter text and try again.");
  return result;
}
export function date(value: string): string {
  const cleaned = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned) || addDays(cleaned, 0) !== cleaned) throw new Error("Invalid date. Use YYYY-MM-DD.");
  return cleaned;
}
export const nullableDate = (value: string | null) => value === null ? null : date(value);
export function time(value: string): string {
  const cleaned = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned)) throw new Error("Invalid time. Use HH:MM in 24-hour time.");
  return cleaned;
}
export function finite(value: number) {
  if (!Number.isFinite(value)) throw new Error("Invalid number. Enter a finite number.");
  return value;
}
export const duration = (value: number | null) => value === null ? null : Math.max(1, Math.min(1440, Math.round(finite(value))));
export function weekdays(values: number[]) {
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 6)) throw new Error("Invalid weekday. Use numbers from 0 to 6.");
  return [...new Set(values)].sort((a, b) => a - b);
}
export const searchText = (title: string, notes: string) => `${title} ${notes}`.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120_000);
export const caps = { areas: 12, projects: 200, goals: 100, events: 100, habits: 50 } as const;
export async function checkCap(ctx: QueryCtx, ownerId: string, table: keyof typeof caps) {
  const rows = await ctx.db.query(table).withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).take(caps[table]);
  if (rows.length >= caps[table]) throw new Error(`Limit of ${caps[table]} ${table} reached. Remove one before adding another.`);
  return rows.length;
}
export async function taskCap(ctx: QueryCtx, ownerId: string) {
  const rows = await ctx.db.query("tasks").withIndex("by_owner_status", (q) => q.eq("ownerId", ownerId).eq("status", "active")).take(5000);
  if (rows.length >= 5000) throw new Error("Limit of 5000 active tasks reached. Complete or remove tasks before adding another.");
}
