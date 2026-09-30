/// <reference types="vite/client" />
import { createHmac, randomUUID } from "node:crypto";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test, vi } from "vitest";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { api } from "../_generated/api";
import { canonicalJson } from "../canonical";
import schema from "../schema";

const modules = import.meta.glob(["../**/*.ts", "../_generated/*.js", "!./**", "!../**/*.d.ts"]);
const cleanup = makeFunctionReference<"action", { ownerId: string; timestamp: number; nonce: string; signature: string }, null>("accountDeletion:cleanup");
function envelope(ownerId: string, operation = "accountDeletion.cleanup", timestamp = Date.now()) {
  const nonce = randomUUID();
  return { ownerId, timestamp, nonce, signature: createHmac("sha256", "local-test-secret").update(canonicalJson([timestamp, nonce, ownerId, operation, {}])).digest("hex") };
}

test("signed account cleanup finishes multiple own-data batches, preserves another owner and global replay guards", async () => {
  vi.useFakeTimers(); vi.stubEnv("SERVICE_SECRET", "local-test-secret");
  try {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    const a = t.withIdentity({ subject: "deletion-a" }), b = t.withIdentity({ subject: "deletion-b" });
    await a.mutation(api.profiles.seedSample, { today: "2026-09-29" });
    await b.mutation(api.profiles.seedSample, { today: "2026-09-29" });
    const before = await b.query(api.day.get, { date: "2026-09-29" });
    for (let i = 0; i < 105; i++) await a.mutation(api.tasks.create, { title: "Disposable" });
    const signed = envelope("deletion-a");
    await t.action(cleanup, signed);
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const tables = ["profiles", "areas", "projects", "tasks", "goals", "milestones", "events", "habits", "habitLogs"] as const;
    for (const table of tables) expect(await t.run((ctx) => ctx.db.query(table).withIndex("by_owner", (q) => q.eq("ownerId", "deletion-a")).first())).toBeNull();
    expect(await b.query(api.day.get, { date: "2026-09-29" })).toEqual(before);
    expect(await b.query(api.profiles.get, {})).not.toBeNull();
    await expect(t.action(cleanup, signed)).rejects.toThrow("Reused");
    // Clerk may deliver the same event again; fresh signed delivery is harmless.
    await t.action(cleanup, envelope("deletion-a"));
  } finally { vi.useRealTimers(); vi.unstubAllEnvs(); }
});
test("wrong-operation, forged-owner, expired or unsigned cleanup cannot remove data", async () => {
  vi.stubEnv("SERVICE_SECRET", "local-test-secret");
  try {
    const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "deletion-b" });
    rateLimiter.register(t);
    await owner.mutation(api.profiles.ensure, {});
    const before = await owner.query(api.areas.list, {});
    for (const signed of [envelope("deletion-b", "profiles.resetAll"), { ...envelope("deletion-a"), ownerId: "deletion-b" }, envelope("deletion-b", undefined, Date.now() - 600_000), { ...envelope("deletion-b"), signature: "0".repeat(64) }]) await expect(t.action(cleanup, signed)).rejects.toThrow();
    expect(await owner.query(api.areas.list, {})).toEqual(before);
  } finally { vi.unstubAllEnvs(); }
});
