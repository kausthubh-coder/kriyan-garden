// Live QA uses only disposable development identities. Credentials stay in memory.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, expect, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../packages/backend/convex/_generated/api";
import { canonicalJson } from "../../packages/backend/convex/canonical";
import { quickAddGrammar } from "../../packages/core/src/quickAddGrammar";
import { parse, localClock, addDays, reminderTimes, goalProgress } from "../../packages/core/src/index";

const root = process.cwd();
nextEnv.loadEnvConfig(resolve(root, "apps/web"));
const secretKey = process.env.CLERK_SECRET_KEY, url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!secretKey?.startsWith("sk_test_") || !url || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) throw new Error("Development credentials required.");
process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(root, ".agents/playwright-browsers");
const sdk = createClerkClient({ secretKey });
const base = process.env.E2E_BASE_URL ?? "http://localhost:3500";
const production = base === "https://app.kriyan.app";
const out = resolve(root, process.env.QA_OUTPUT ?? ".data/15");
await mkdir(out, { recursive: true });
await mkdir(resolve(root, ".agents/screenshots/15"), { recursive: true });
type Receipt = { label: string; status: "pass" | "fail" | "blocked"; detail?: unknown };
const receipts: Receipt[] = [];
const users: { id: string; email: string; client: ConvexHttpClient; refresh: () => Promise<void> }[] = [];
async function record(label: string, work: () => Promise<unknown>) {
  if (process.env.QA_LABEL && !new RegExp(process.env.QA_LABEL).test(label) && !/Cleanup|Delete disposable|Final listing/.test(label)) return;
  try { const detail = await work(); receipts.push({ label, status: "pass", detail }); }
  catch (error) {
    // Expected task fixtures are public test data. Never emit raw SDK/HTTP exceptions.
    const message = error instanceof Error ? error.message : "Check failed";
    const detail = message.replace(/(?:sk_|pk_|oat_|ak_|sess_|eyJ)[A-Za-z0-9_.-]+/g, "[redacted]").slice(0, 2000);
    receipts.push({ label, status: "fail", detail });
  }
  console.log(JSON.stringify(receipts.at(-1)));
  await writeFile(resolve(out, "results.json"), JSON.stringify(receipts, null, 2));
}
function tableRows(table: string): Record<string, unknown>[] {
  const raw = execFileSync("bunx", ["convex", "data", table, "--limit", "10000", "--format", "json", ...(production ? ["--prod"] : [])], { cwd: resolve(root, "packages/backend"), stdio: "pipe", windowsHide: true, encoding: "utf8", maxBuffer: 30_000_000 });
  if (!raw.trim()) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length === 10000) throw new Error("Table inspection incomplete, increase the read limit.");
  return rows as Record<string, unknown>[];
}
async function signIn(page: Page, email: string) {
  await setupClerkTestingToken({ page });
  await page.goto(`${base}/sign-in`);
  await clerk.signIn({ page, emailAddress: email });
  await page.goto(`${base}/app`);
  await expect(page.locator('[data-loading="false"]')).toBeVisible({ timeout: 30000 });
}
async function add(page: Page, text: string) {
  await page.getByRole("button", { name: "Add task", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add a task" });
  await dialog.getByRole("textbox").fill(text);
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
const refreshTimer = setInterval(() => { void Promise.all(users.map(u => u.refresh())).catch(() => {}); }, 20000);
const browser = await chromium.launch({ channel: "chrome" });
try {
  await clerkSetup();
  for (const label of ["a", "b"]) {
    const email = `kriyan-qa15-${label}-${randomUUID()}+clerk_test@example.com`;
    const user = await sdk.users.createUser({ emailAddress: [email], skipPasswordRequirement: true, privateMetadata: { qaBrief: "15" } });
    // IDs are saved before any later action so interrupted runs can be cleaned.
    const client = new ConvexHttpClient(url, { logger: false });
    const entry = { id: user.id, email, client, refresh: async () => {} };
    users.push(entry);
    await writeFile(resolve(out, "users.json"), JSON.stringify(users.map(({ id, email }) => ({ id, email }))));
    const session = await sdk.sessions.createSession({ userId: user.id });
    entry.refresh = async () => { const token = await sdk.sessions.getToken(session.id, "convex"); client.setAuth(token.jwt); };
    await entry.refresh();
    await client.mutation(api.profiles.ensure, { timezone: "America/New_York" });
    await client.mutation(api.profiles.completeOnboarding, {});
  }
  const a = users[0], b = users[1];
  if (!a || !b) throw new Error("Two users required.");
  const today = localClock(new Date(), "America/New_York").today;
  const area = (await a.client.query(api.areas.list, {}))[0];
  if (!area) throw new Error("No area fixture.");
  const project = await a.client.mutation(api.projects.create, { name: "Econ 101", areaId: area._id, kind: "course" });
  const goal = await a.client.mutation(api.goals.create, { title: "QA private goal", areaId: area._id, startDate: today, targetDate: addDays(today, 10), metric: { kind: "number", current: 5, target: 10, unit: "pages" } });
  const task = await a.client.mutation(api.tasks.create, { title: "QA private task", date: today, time: "14:00", goalId: goal._id, projectId: project._id, notes: "Disposable notes" });
  await record("Backend task validation and clearing fields", async () => {
    await expect(a.client.mutation(api.tasks.create, { title: "Invalid time", time: "10:00", date: null })).rejects.toThrow();
    const edited = await a.client.mutation(api.tasks.update, { id: task._id, patch: { title: "QA edited", durationMinutes: 45, deadline: addDays(today, 1), repeat: { every: 1, unit: "day" }, notes: "Edited" } });
    expect(edited).toMatchObject({ durationMinutes: 45, notes: "Edited" });
    const cleared = await a.client.mutation(api.tasks.update, { id: task._id, patch: { projectId: null, goalId: null, date: null, deadline: null, durationMinutes: null, repeat: null, reminders: [], notes: "" } });
    expect(cleared).toMatchObject({ date: null, time: null, durationMinutes: null, projectId: null, goalId: null, repeat: null, reminders: [], notes: "" });
  });
  await record("Live direct owner isolation for task and goal", async () => {
    expect(await b.client.query(api.tasks.list, {})).toEqual([]);
    expect(await b.client.query(api.tasks.lookup, { key: task._id })).toBeNull();
    await expect(b.client.query(api.tasks.get, { id: task._id })).rejects.toThrow();
    await expect(b.client.mutation(api.tasks.update, { id: task._id, patch: { title: "Intrusion" } })).rejects.toThrow();
    await expect(b.client.query(api.goals.get, { id: goal._id })).rejects.toThrow();
    await expect(b.client.mutation(api.goals.update, { id: goal._id, patch: { title: "Intrusion" } })).rejects.toThrow();
  });
  await record("All four repeat kinds and concurrent completion", async () => {
    const cases = [
      { date: "2026-09-30", repeat: { every: 1, unit: "day" as const }, next: "2026-10-01" },
      { date: "2026-09-30", repeat: { every: 1, unit: "week" as const, weekdays: [1, 3] }, next: "2026-10-05" },
      { date: "2027-01-31", repeat: { every: 1, unit: "month" as const }, next: "2027-02-28" },
      { date: "2028-02-29", repeat: { every: 1, unit: "year" as const }, next: "2029-02-28" },
    ];
    for (const [i, item] of cases.entries()) {
      const title = `QA repeat ${i}`;
      const row = await a.client.mutation(api.tasks.create, { title, date: item.date, repeat: item.repeat });
      await Promise.all([a.client.mutation(api.tasks.complete, { id: row._id }), a.client.mutation(api.tasks.complete, { id: row._id })]);
      const saved = (await a.client.query(api.tasks.list, {})).filter(t => t.title === title);
      expect(saved).toHaveLength(2);
      expect(saved.find(t => t.status === "active")?.date).toBe(item.next);
    }
    return cases;
  });
  await record("Five reminder kinds, validation, live scheduling and cancellation", async () => {
    const reminders = [{ type: "at_start" as const }, { type: "before" as const, minutes: 10 }, { type: "morning_of" as const }, { type: "day_before" as const }, { type: "at_time" as const, time: "12:00" }];
    const date = addDays(today, 3);
    const row = await a.client.mutation(api.tasks.create, { title: "QA reminders", date, time: "14:00", reminders });
    expect(row.reminders).toEqual(reminders);
    const jobs = () => tableRows("reminderJobs").filter(j => j.ownerId === a.id && j.taskId === row._id);
    expect(jobs().filter(j => j.state === "pending").map(j => j.fireAt).sort()).toEqual(reminderTimes(row, "America/New_York", Date.now()).sort());
    await a.client.mutation(api.tasks.update, { id: row._id, patch: { date: addDays(date, 1) } });
    expect(jobs().filter(j => j.state === "cancelled")).toHaveLength(5);
    expect(jobs().filter(j => j.state === "pending")).toHaveLength(5);
    await a.client.mutation(api.tasks.complete, { id: row._id });
    expect(jobs().filter(j => j.state === "pending")).toHaveLength(0);
    for (const type of ["at_start", "before"] as const) await expect(a.client.mutation(api.tasks.create, { title: "Invalid reminder", date, reminders: [type === "before" ? { type, minutes: 10 } : { type }] })).rejects.toThrow();
    await expect(a.client.mutation(api.tasks.create, { title: "Too many reminders", date, time: "14:00", reminders: Array.from({ length: 9 }, () => ({ type: "morning_of" as const })) })).rejects.toThrow();
    return { initialJobs: 5, cancelledAfterMove: 5, pendingAfterCompletion: 0 };
  });
  await record("Live goals, milestones, linked tasks, deletion and restore", async () => {
    for (const kind of ["tasks", "milestones"] as const) {
      const g = await a.client.mutation(api.goals.create, { title: `QA ${kind}`, areaId: area._id, startDate: today, metric: { kind } });
      const linked = await a.client.mutation(api.tasks.create, { title: `QA linked ${kind}`, goalId: g._id });
      const milestone = await a.client.mutation(api.goals.createMilestone, { goalId: g._id, title: "QA milestone" });
      await a.client.mutation(api.goals.updateMilestone, { id: milestone._id, patch: { doneAt: Date.now() } });
      const snapshot = await a.client.mutation(api.goals.deleteForUndo, { id: g._id });
      expect((await a.client.query(api.tasks.get, { id: linked._id })).goalId).toBeNull();
      await a.client.mutation(api.goals.restore, { snapshot });
      expect((await a.client.query(api.tasks.get, { id: linked._id })).goalId).not.toBeNull();
    }
    const g = (await a.client.query(api.goals.list, {})).find(g => g._id === goal._id);
    if (!g) throw new Error("Goal fixture missing");
    const variants = [
      { current: 0, today: addDays(today, 5), expected: "Behind pace" },
      { current: 5, today: addDays(today, 5), expected: "On pace" },
      { current: 8, today: addDays(today, 5), expected: "Ahead" },
      { current: 8, today: addDays(today, 11), expected: "Late" },
    ];
    for (const v of variants) expect(goalProgress({ ...g, metric: { kind: "number", current: v.current, target: 10, unit: "pages" } }, v.today).status).toBe(v.expected);
    return variants;
  });
  for (const width of [1440, 390]) {
    await a.refresh(); await b.refresh();
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: "America/New_York" });
    const page = await context.newPage();
    const csp: string[] = [];
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", e => console.warn(`qa-csp:${e.effectiveDirective}`)));
    page.on("console", msg => { if (msg.text().startsWith("qa-csp:")) csp.push(msg.text()); });
    await record(`Signed-out app redirect ${width}`, async () => { await page.goto(`${base}/app`); expect(new URL(page.url()).pathname).toContain("/sign-in"); });
    await signIn(page, a.email);
    await record(`Grammar table typed through web and stored ${width}`, async () => {
      const areas = await a.client.query(api.areas.list, {});
      const projects = await a.client.query(api.projects.list, {});
      let count = 0;
      for (const row of quickAddGrammar) for (const token of row.tokens) {
        const text = `QA${width}token${count++} ${token}`;
        await page.goto(`${base}/app?date=${today}`);
        await expect(page.locator('[data-loading="false"]')).toBeVisible();
        await add(page, text);
        const expected = parse(text, { today, defaultDate: today, defaultAreaId: areas.find(x => x.color === "green")?._id ?? areas[0]?._id ?? null, areas: areas.map(x => ({ id: x._id, name: x.name })), projects: projects.map(x => ({ id: x._id, name: x.name, areaId: x.areaId })) });
        await expect.poll(async () => (await a.client.query(api.tasks.list, {})).find(t => t.title === expected.title)).toMatchObject(expected);
      }
      return { documentedRows: quickAddGrammar.length, storedTokens: count };
    });
    await record(`Realtime between two windows ${width}`, async () => {
      const second = await context.newPage();
      await second.goto(`${base}/app?view=list`);
      await expect(second.getByRole("button", { name: "Add task", exact: true }).first()).toBeVisible();
      await page.goto(`${base}/app?view=list`);
      await add(page, `QA sync ${width} later`);
      await expect(second.getByRole("button", { name: `Open task: QA sync ${width}`, exact: true })).toBeVisible();
      await second.close();
    });
    await record(`Offline three UI changes saved once ${width}`, async () => {
      await page.goto(`${base}/app?view=list`);
      await expect(page.getByRole("button", { name: "Add task", exact: true }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "School", exact: true })).toBeVisible();
      await context.setOffline(true);
      for (let i = 0; i < 3; i++) {
        const open = page.getByRole("button", { name: "Add task", exact: true }).first();
        await open.click();
        const dialog = page.getByRole("dialog", { name: "Add a task" });
        await dialog.getByRole("textbox").fill(`QA offline ${width} ${i} later`);
        await dialog.getByRole("button", { name: "Add task", exact: true }).click();
        await expect(dialog).not.toBeVisible();
        // A mutation remains pending offline. Escape permits another capture.
        if (await dialog.isVisible()) await page.keyboard.press("Escape");
      }
      await context.setOffline(false);
      await expect.poll(async () => (await a.client.query(api.tasks.list, {})).filter(t => t.title.startsWith(`QA offline ${width}`)).length, { timeout: 30000 }).toBe(3);
      return { changes: 3 };
    });
    await context.setOffline(false);
    await record(`Every planner view reload, URL state, back and forward ${width}`, async () => {
      for (const view of ["day", "list", "week", "goals"]) {
        await page.goto(`${base}/app?view=${view}&date=${today}&area=${area._id}`);
        await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeVisible();
        await page.reload();
        expect(new URL(page.url()).searchParams.get("view")).toBe(view);
        expect(new URL(page.url()).searchParams.get("area")).toBe(area._id);
      }
      const navigation = page.getByRole("navigation", { name: "Main", exact: true });
      await navigation.getByRole("button", { name: "Week", exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("week");
      await navigation.getByRole("button", { name: "Goals", exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("goals");
      await page.goBack(); await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("week");
      await page.goForward(); await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("goals");
    });
    await record(`Profile today and now line in Auckland and Honolulu ${width}`, async () => {
      const observations = [];
      for (const zone of ["Pacific/Auckland", "Pacific/Honolulu"]) {
        await a.client.mutation(api.profiles.update, { patch: { timezone: zone, dayStartHour: 0, dayEndHour: 24 } });
        await page.goto(`${base}/app`);
        await expect(page.locator('[data-loading="false"]')).toBeVisible();
        const clock = localClock(new Date(), zone);
        const current = await page.locator('button[aria-label*="Today"]').count();
        const line = page.locator('[data-timeline] > div[style*="var(--hh)"]').filter({ has: page.locator('span') }).last();
        await expect(line).toContainText(`${String(Math.floor(clock.minutes / 60)).padStart(2, "0")}:${String(clock.minutes % 60).padStart(2, "0")}`);
        await page.screenshot({ path: resolve(root, `.agents/screenshots/15/zone-${zone.split("/")[1]}-${width}.png`) });
        observations.push({ zone, expectedToday: clock.today, expectedMinutes: clock.minutes, todayControls: current });
      }
      return observations;
    });
    await a.client.mutation(api.profiles.update, { patch: { timezone: "America/New_York" } });
    await record(`Axe every planner view and settings section ${width}`, async () => {
      const results = [];
      for (const route of ["/app", "/app?view=list", "/app?view=week", "/app?view=goals", ...["areas", "projects", "classes", "habits", "planning", "account", "reset"].map(s => `/app/settings/${s}`)]) {
        await page.goto(`${base}${route}`);
        await page.addScriptTag({ path: resolve(root, "node_modules/axe-core/axe.min.js") });
        const violations = await page.evaluate(async () => {
          const axe = (window as Window & { axe: { run: (options: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
          return (await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) }));
        });
        results.push({ route, violations });
      }
      await writeFile(resolve(out, `axe-${width}.json`), JSON.stringify(results, null, 2));
      expect(results.flatMap(r => r.violations)).toEqual([]);
      return results.map(r => ({ route: r.route, violations: r.violations.length }));
    });
    await record(`Signed-in CSP ${width}`, async () => { expect(csp).toEqual([]); });
    await record(`Sign out ${width}`, async () => { await clerk.signOut({ page }); await page.goto(`${base}/app`); expect(new URL(page.url()).pathname).toContain("/sign-in"); });
    await context.close();
  }
  const bc = await browser.newContext(); const bp = await bc.newPage();
  await signIn(bp, b.email);
  await record("Foreign task and goal URLs in user B", async () => {
    await bp.goto(`${base}/app?task=${task._id}`);
    await expect(bp.getByRole("alert").filter({ hasText: "This task is unavailable" })).toBeVisible();
    await bp.goto(`${base}/app?view=goals&goal=${goal._id}`);
    await expect(bp.getByText("QA private goal", { exact: true })).toHaveCount(0);
  });
  await bc.close();
  await record("Live service rate limit triggers and recovers", async () => {
    const secret = process.env.SERVICE_SECRET ?? process.env.MCP_SERVICE_SECRET;
    if (!secret) throw new Error("Service signing configuration missing");
    const call = () => { const timestamp = Date.now(), nonce = randomUUID(); return a.client.action(api.service.areasList, { ownerId: a.id, timestamp, nonce, signature: createHmac("sha256", secret).update(canonicalJson([timestamp, nonce, a.id, "areas.list", {}])).digest("hex") }); };
    // Stay inside one minute so the boundary cannot reset the test halfway.
    const wait = 60000 - Date.now() % 60000;
    if (wait < 15000) await new Promise(r => setTimeout(r, wait + 100));
    for (let i = 0; i < 60; i++) await call();
    await expect(call()).rejects.toThrow("RATE_LIMITED");
    await new Promise(r => setTimeout(r, 60000 - Date.now() % 60000 + 200));
    expect(await call()).toHaveLength(3);
    return { readLimit: 60, recovered: true };
  });
  await record("Reset all tables preserves B and clears A", async () => {
    await a.refresh(); await b.refresh();
    const other = await b.client.mutation(api.tasks.create, { title: "QA B preserved" });
    await a.client.mutation(api.profiles.resetAll, {});
    await expect.poll(() => a.client.query(api.profiles.get, {}), { timeout: 30000 }).toBeNull();
    expect(await b.client.query(api.tasks.get, { id: other._id })).toEqual(other);
    const tables = ["profiles", "areas", "projects", "tasks", "goals", "milestones", "events", "habits", "habitLogs", "reminderJobs", "pushTokens", "serviceNonces", "serviceInvocations"];
    const counts = Object.fromEntries(tables.map(t => [t, tableRows(t).filter(r => r.ownerId === a.id).length]));
    expect(Object.values(counts).every(n => n === 0)).toBe(true);
    return { counts, userBPreserved: true };
  });
} finally {
  clearInterval(refreshTimer);
  await browser.close();
  for (const user of users) {
    await record(`Cleanup data for ${user.id}`, async () => { await user.refresh(); await user.client.mutation(api.profiles.resetAll, {}); await expect.poll(() => user.client.query(api.profiles.get, {}), { timeout: 30000 }).toBeNull(); });
    await record(`Delete disposable identity ${user.id}`, async () => { await sdk.users.deleteUser(user.id); });
  }
  await record("Final listing of disposable users and all owned tables", async () => {
    const remaining = await sdk.users.getUserList({ query: "kriyan-qa15-", limit: 100 });
    expect(remaining.totalCount).toBe(0);
    const tables = ["profiles", "areas", "projects", "tasks", "goals", "milestones", "events", "habits", "habitLogs", "reminderJobs", "pushTokens", "serviceNonces", "serviceInvocations"];
    const counts = Object.fromEntries(tables.map(t => [t, tableRows(t).filter(r => users.some(u => u.id === r.ownerId)).length]));
    expect(Object.values(counts).every(n => n === 0)).toBe(true);
    return { remainingClerkUsers: remaining.totalCount, counts };
  });
}
process.exitCode = receipts.some(r => r.status === "fail") ? 1 : 0;
