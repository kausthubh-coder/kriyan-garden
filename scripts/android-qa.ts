/** Disposable development identity held only in memory. No tokens/passwords are logged or saved. */
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../packages/backend/convex/_generated/api";
import { localClock, addDays } from "@kriyan/core";
const values = new Map<string, string>();
for (const path of ["apps/web/.env.local", "packages/backend/.env.local"]) {
  for (const line of (await Bun.file(path).text()).split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].replace(/^['"]|['"]$/g, ""));
  }
}
const secretKey = values.get("CLERK_SECRET_KEY"), url = values.get("NEXT_PUBLIC_CONVEX_URL");
if (!secretKey?.startsWith("sk_test_") || !url) throw new Error("A development Clerk instance and public Convex URL are required.");
const clerk = createClerkClient({ secretKey });
const email = `android-qa-${Date.now()}+clerk_test@example.com`;
const password = `KriyanQA${crypto.randomUUID().replaceAll("-", "")}9a`;
const user = await clerk.users.createUser({ emailAddress: [email], password, firstName: "Android QA", privateMetadata: { disposableKriyanAndroidTest: true } });
const session = await clerk.sessions.createSession({ userId: user.id }).catch(async () => {
  await clerk.users.deleteUser(user.id);
  throw new Error("The disposable test session could not be created. Its user was deleted.");
});
const client = new ConvexHttpClient(url);
const adbPath = `${process.cwd()}/.agents/android-sdk/platform-tools/adb.exe`;
const serial = "emulator-5554";
const results: string[] = [];
const refresh = async () => { const token = await clerk.sessions.getToken(session.id, "convex"); client.setAuth(token.jwt); };
async function adb(args: string[]) {
  const process = Bun.spawn([adbPath, "-s", serial, ...args], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(process.stdout).text();
  await process.exited;
  if (process.exitCode !== 0) throw new Error("ADB operation failed.");
  return text;
}
async function find(label: string) {
  await adb(["shell", "uiautomator", "dump", "/sdcard/kriyan-qa-ui.xml"]);
  const xml = await adb(["exec-out", "cat", "/sdcard/kriyan-qa-ui.xml"]);
  const rows = xml.match(/<node\b[^>]*>/g) ?? [];
  const node = rows.find(row => row.includes(`content-desc="${label}"`)) ?? rows.find(row => row.includes(`text="${label}"`));
  const match = node ? /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node) : null;
  if (!match) throw new Error(`UI control not found: ${label}`);
  return [Math.round((Number(match[1]) + Number(match[3])) / 2), Math.round((Number(match[2]) + Number(match[4])) / 2)];
}
async function tap(label: string) { const [x, y] = await find(label); await adb(["shell", "input", "tap", String(x), String(y)]); }
const pause = () => new Promise(resolve => setTimeout(resolve, 900));
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  await refresh(); await client.mutation(api.profiles.resetAll, {});
  const remaining = await client.query(api.tasks.list, {});
  if (remaining.length) throw new Error("Disposable planner cleanup is still pending.");
  await clerk.users.deleteUser(user.id); cleaned = true;
  if ((await adb(["shell", "pm", "list", "packages", "app.kriyan.android"])).includes("package:app.kriyan.android"))
    await adb(["shell", "pm", "clear", "app.kriyan.android"]);
  await adb(["shell", "rm", "-f", "/sdcard/kriyan-qa-ui.xml"]);
  await Bun.write(".agents/logs/android-qa-cleanup.json", JSON.stringify({ plannerResetVerified: true, disposableUserDeleted: true, deviceSessionCleared: true }, null, 2));
  console.log("Disposable planner data and Clerk user deleted; Android session cleared.");
}
const server = Bun.serve({
  hostname: "127.0.0.1", port: 4781, idleTimeout: 60,
  async fetch(request) {
    const action = new URL(request.url).pathname;
    try {
      await refresh();
      const today = localClock(new Date(), "America/New_York").today;
      if (action === "/sign-in") {
        await tap("Email"); await adb(["shell", "input", "text", email]);
        await tap("Password"); await adb(["shell", "input", "text", password]);
        await adb(["shell", "input", "keyevent", "4"]); await pause(); await tap("Sign in");
        await pause();
        console.log("Disposable email/password sign-in submitted.");
        return Response.json({ submitted: true });
      }
      if (action === "/setup") {
        await client.mutation(api.profiles.ensure, { timezone: "America/New_York" });
        await client.mutation(api.profiles.update, { patch: { timezone: "America/New_York" } });
        const areas = await client.query(api.areas.list, {});
        if (!areas[0]) throw new Error("No test areas.");
        const project = await client.mutation(api.projects.create, { name: "Android QA course", areaId: areas[0]._id, kind: "course" });
        const goal = await client.mutation(api.goals.create, { title: "Android QA goal", areaId: areas[0]._id, startDate: today, targetDate: addDays(today, 7), metric: { kind: "milestones" } });
        await client.mutation(api.goals.createMilestone, { goalId: goal._id, title: "Try the Android planner" });
        await client.mutation(api.events.create, { title: "Android QA class", areaId: areas[0]._id, weekdays: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "09:00", fromDate: today });
        await client.mutation(api.tasks.create, { title: "Android QA timed", areaId: areas[0]._id, projectId: project._id, goalId: goal._id, date: today, time: "09:30", durationMinutes: 45, deadline: addDays(today, 1) });
        await client.mutation(api.tasks.create, { title: "Android QA marker", areaId: areas[1]?._id ?? areas[0]._id, date: today, time: "10:30" });
        await client.mutation(api.tasks.create, { title: "Android QA any time", areaId: areas[2]?._id ?? areas[0]._id, date: today });
        await client.mutation(api.tasks.create, { title: "Android QA no date", areaId: areas[0]._id });
        console.log("Disposable backend fixture created through public operations.");
        return Response.json({ created: true });
      }
      if (action === "/tasks") {
        const rows = await client.query(api.tasks.list, {});
        return Response.json(rows.map(({ title, date, time, durationMinutes, status, reminders }) => ({ title, date, time, durationMinutes, status, reminders })));
      }
      if (action === "/profile") return Response.json({ onboardingComplete: (await client.query(api.profiles.get, {}))?.onboardingComplete });
      if (action === "/receipt") { const body: unknown = await request.json(); if (typeof body === "string") results.push(body); await Bun.write(".agents/logs/android-qa-results.json", JSON.stringify(results, null, 2)); return Response.json({ recorded: true }); }
      if (action === "/cleanup") { await cleanup(); setTimeout(() => { server.stop(true); process.exit(0); }, 100); return Response.json({ cleaned: true }); }
      return Response.json({ error: "Unknown QA operation." }, { status: 404 });
    } catch { console.log(`QA operation failed: ${action}. No credentials logged.`); return Response.json({ error: "QA operation failed. Inspect the UI or retry the operation." }, { status: 500 }); }
  },
});
process.on("SIGINT", () => { void cleanup().then(() => process.exit(0)).catch(() => { console.log("Cleanup did not finish. Retry the local cleanup endpoint before stopping."); }); });
console.log("Disposable development user ready. QA helper listening on 127.0.0.1:4781.");
