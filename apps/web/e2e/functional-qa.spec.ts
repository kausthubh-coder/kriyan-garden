import { test, expect, type Page } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@kriyan/backend/convex/_generated/api";
import { addDays, localClock, reminderTimes } from "@kriyan/core";
import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
async function disposable(page: Page, onboarding = false) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey?.startsWith("sk_test_")) throw new Error("Development credentials required");
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  await clerkSetup();
  const sdk = createClerkClient({ secretKey });
  const email = `kriyan-qa15-extra-${crypto.randomUUID().slice(0,20)}+clerk_test@example.com`;
  const user = await sdk.users.createUser({ emailAddress: [email], skipPasswordRequirement: true });
  await mkdir("../../.data/15", { recursive: true });
  await appendFile("../../.data/15/extra-user-ids.jsonl", JSON.stringify({ id: user.id, email }) + "\n");
  const backend = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "", { logger: false });
  const session = await sdk.sessions.createSession({ userId: user.id });
  async function refresh() { backend.setAuth((await sdk.sessions.getToken(session.id, "convex")).jwt); }
  await refresh();
  const timer = setInterval(() => { void refresh(); }, 20000);
  const cleanup = async () => {
    clearInterval(timer);
    await page.close();
    await refresh();
    await backend.mutation(api.profiles.resetAll, {});
    await expect.poll(() => backend.query(api.profiles.get, {})).toBeNull();
    await sdk.users.deleteUser(user.id);
  };
  try {
    await backend.mutation(api.profiles.ensure, { timezone: "America/New_York" });
    if (!onboarding) await backend.mutation(api.profiles.completeOnboarding, {});
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await clerk.signIn({ page, emailAddress: email });
    await page.goto("/app");
    return { backend, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
async function axe(page: Page) {
  await page.addScriptTag({ path: resolve("../../node_modules/axe-core/axe.min.js") });
  return page.evaluate(async () => {
    const runner = (window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string; impact: string }[] }> } }).axe;
    return (await runner.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact }));
  });
}
for (const width of [1440, 390]) {
  test(`QA15 real email signup ${width}`, async ({ page }) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey?.startsWith("sk_test_")) throw new Error("Development credentials required");
    const sdk = createClerkClient({ secretKey });
    process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    await clerkSetup();
    await setupClerkTestingToken({ page });
    const email = `kriyan-qa15-signup-${crypto.randomUUID().slice(0,20)}+clerk_test@example.com`;
    await page.setViewportSize({width,height:900});
    try {
      await page.goto("/sign-up");
      await page.getByRole("textbox",{name:"Email address",exact:true}).fill(email);
      await page.getByRole("textbox",{name:"Password",exact:true}).fill(`Qa15!${crypto.randomUUID()}X7`);
      await page.getByRole("button",{name:"Continue",exact:true}).click();
      await page.locator('input[autocomplete="one-time-code"]').fill("424242");
      await expect(page).toHaveURL(/localhost:3500\/$/);
      await page.getByRole("navigation",{name:"Website"}).getByRole("link",{name:"Open Kriyan",exact:true}).click();
      await expect(page.getByRole("heading",{name:"What do you plan for?",exact:true})).toBeVisible();
    } finally {
      await page.close();
      const created = (await sdk.users.getUserList({ emailAddress:[email] })).data;
      for (const user of created) {
        await appendFile("../../.data/15/extra-user-ids.jsonl",JSON.stringify({id:user.id,email})+"\n");
        const session = await sdk.sessions.createSession({userId:user.id});
        const backend = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "",{logger:false});
        backend.setAuth((await sdk.sessions.getToken(session.id,"convex")).jwt);
        await backend.mutation(api.profiles.resetAll,{});
        await expect.poll(()=>backend.query(api.profiles.get,{})).toBeNull();
        await sdk.users.deleteUser(user.id);
      }
    }
  });
  test(`QA15 task panel properties, shortcuts and Undo ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height:900 });
    const fixture = await disposable(page);
    try {
      const backend = fixture.backend, today = localClock(new Date(), "America/New_York").today;
      const area = (await backend.query(api.areas.list,{}))[0];
      if (!area) throw new Error("Missing test area");
      const project = await backend.mutation(api.projects.create,{name:"QA course",areaId:area._id});
      const goal = await backend.mutation(api.goals.create,{title:"QA linked goal",areaId:area._id,startDate:today});
      let task = await backend.mutation(api.tasks.create,{title:"QA panel",areaId:area._id,date:today});
      await page.goto(`/app?view=list&task=${task._id}`);
      const panel = page.getByRole("dialog",{name:"Task details"});
      await expect(panel).toBeVisible();
      const property = (id:string)=>panel.locator(`[data-property="${id}"]`);
      const saved = (patch:Record<string,unknown>)=>expect.poll(()=>backend.query(api.tasks.get,{id:task._id})).toMatchObject(patch);
      await panel.getByLabel("Task title").fill("QA edited panel");
      await panel.getByLabel("Task title").press("Tab"); await saved({title:"QA edited panel"});
      await panel.getByLabel("Notes",{exact:true}).fill("QA notes");
      await panel.getByLabel("Notes",{exact:true}).press("Tab"); await saved({notes:"QA notes"});
      for (const [id,label,patch] of [
        ["project","QA course",{projectId:project._id}], ["goal","QA linked goal",{goalId:goal._id}],
        ["length","45m",{durationMinutes:45}], ["repeat","Daily",{repeat:{unit:"day",every:1}}],
      ] as const) { await property(id).click(); await panel.getByRole("group",{name:id==="length"?"Length editor":id==="repeat"?"Repeat editor":id==="goal"?"Goal editor":"Project editor"}).getByRole("button",{name:label,exact:true}).click(); await saved(patch); }
      await property("time").click(); await panel.getByLabel("Start time",{exact:true}).fill("10:00"); await saved({time:"10:00"});
      await property("deadline").click(); await panel.getByRole("group",{name:"Deadline editor"}).getByRole("button",{name:"Tomorrow",exact:true}).click(); await saved({deadline:addDays(today,1)});
      await property("reminders").click();
      for (const name of ["At start","10 min before","Morning of","Day before"]) {
        await panel.getByRole("button",{name,exact:true}).click();
        await expect.poll(async()=> (await backend.query(api.tasks.get,{id:task._id})).reminders.length).toBe(["At start","10 min before","Morning of","Day before"].indexOf(name)+1);
      }
      await panel.getByRole("button",{name:"At a time",exact:true}).click();
      await panel.getByLabel("Reminder time").fill("12:00");
      await panel.getByRole("button",{name:"Add reminder",exact:true}).click();
      await expect.poll(async()=> (await backend.query(api.tasks.get,{id:task._id})).reminders.length).toBe(5);
      expect(await axe(page)).toEqual([]);
      while (await panel.getByRole("button",{name:/^Remove reminder:/}).count()) {
        const before = await panel.getByRole("button",{name:/^Remove reminder:/}).count();
        await panel.getByRole("button",{name:/^Remove reminder:/}).first().click();
        await expect(panel.getByRole("button",{name:/^Remove reminder:/})).toHaveCount(before-1);
      }
      for (const [id,label,patch] of [
        ["repeat","Does not repeat",{repeat:null}], ["project","None",{projectId:null}], ["goal","None",{goalId:null}],
        ["length","None",{durationMinutes:null}], ["deadline","None",{deadline:null}], ["time","Any time",{time:null}],
        ["day","No date",{date:null,time:null}],
      ] as const) { await property(id).click(); await panel.getByRole("button",{name:label,exact:true}).click(); await saved(patch); }
      await panel.getByLabel("Notes",{exact:true}).fill(""); await panel.getByLabel("Notes",{exact:true}).press("Tab"); await saved({notes:""});
      await panel.getByRole("button",{name:"Close task details"}).click();
      await expect(panel).not.toBeVisible();
      const trigger = page.getByRole("button",{name:"Open task: QA edited panel",exact:true});
      await trigger.focus(); await page.keyboard.press("Enter"); await expect(panel).toBeVisible();
      await panel.getByRole("button",{name:"Close task details"}).click();
      await expect(panel).not.toBeVisible();
      await trigger.focus(); await page.keyboard.press("m"); await expect(panel.getByLabel("Move to")).toBeFocused();
      await panel.getByRole("button",{name:"Close task details"}).click();
      await expect(panel).not.toBeVisible();
      await trigger.focus(); await page.keyboard.press("l"); await expect(panel.getByRole("group",{name:"Length editor"})).toBeVisible();
      await panel.getByRole("button",{name:"Close task details"}).click();
      await expect(panel).not.toBeVisible();
      await page.getByRole("checkbox",{name:"Mark as done: QA edited panel",exact:true}).click(); await saved({status:"completed"});
      await page.getByRole("button",{name:"Undo",exact:true}).click(); await saved({status:"active"});
      await page.getByRole("checkbox",{name:"Mark as done: QA edited panel",exact:true}).click(); await saved({status:"completed"});
      await page.getByRole("checkbox",{name:"Mark as not done: QA edited panel",exact:true}).click(); await saved({status:"active"});
      await page.getByRole("button",{name:"Undo",exact:true}).click(); await saved({status:"completed"});
      await trigger.click(); await panel.getByRole("button",{name:"Delete task",exact:true}).click();
      await expect.poll(()=>backend.query(api.tasks.list,{})).toEqual([]);
      await page.getByRole("button",{name:"Undo",exact:true}).click();
      await expect.poll(()=>backend.query(api.tasks.list,{})).toHaveLength(1);
      task = (await backend.query(api.tasks.list,{}))[0];
      if (!task) throw new Error("Undo lost the test task");
      await page.reload(); await expect(page.getByRole("button",{name:"Undo",exact:true})).toHaveCount(0);
    } finally { await fixture.cleanup(); }
  });
  test(`QA15 keyboard, offline, browser history and timezone ${width}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await disposable(page);
    try {
      const { backend } = fixture;
      const today = localClock(new Date(), "America/New_York").today;
      const rows = await Promise.all([0,1,2].map(i => backend.mutation(api.tasks.create, { title: `QA offline ${i}`, date: today })));
      await page.goto("/app?view=list");
      for (const row of rows) await expect(page.getByRole("checkbox", { name: `Mark as done: ${row.title}`, exact: true })).toBeVisible();
      await context.setOffline(true);
      for (const row of rows) await page.getByRole("checkbox", { name: `Mark as done: ${row.title}`, exact: true }).click();
      await context.setOffline(false);
      await expect.poll(async () => (await backend.query(api.tasks.list, {})).filter(t=>t.status==="completed").length, { timeout:30000 }).toBe(3);
      await page.getByRole("button", { name: "Day", exact: true }).click();
      await expect(page.locator('[data-loading="false"]')).toBeVisible();
      for (const [key, view] of [["2","list"],["3","week"],["4","goals"],["1","day"]]) {
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        await page.keyboard.press(key);
        await expect.poll(() => new URL(page.url()).searchParams.get("view") ?? "day").toBe(view);
      }
      for (const key of ["n", "Control+k", "?"]) {
        await page.keyboard.press(key);
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        expect(await axe(page)).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      }
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => new URL(page.url()).searchParams.get("date")).toBe(addDays(today,1));
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("t");
      await expect.poll(() => new URL(page.url()).searchParams.get("date")).toBe(today);
      await page.getByRole("button", { name: "Week", exact: true }).click();
      await expect(page).toHaveURL(/view=week/);
      await page.getByRole("button", { name: "Goals", exact: true }).click();
      await expect(page).toHaveURL(/view=goals/);
      await page.goBack(); await expect(page).toHaveURL(/view=week/);
      await page.goForward(); await expect(page).toHaveURL(/view=goals/);
      for (const zone of ["Pacific/Auckland", "Pacific/Honolulu"]) {
        await backend.mutation(api.profiles.update, { patch:{ timezone:zone, dayStartHour:0, dayEndHour:24 } });
        await page.goto("/app");
        await expect(page.locator('[data-loading="false"]')).toBeVisible();
        const clock = localClock(new Date(), zone);
        await expect(page.locator('[class$="__now"]')).toHaveText(`${String(Math.floor(clock.minutes/60)).padStart(2,"0")}:${String(clock.minutes%60).padStart(2,"0")}`);
        const timeline = page.locator('[data-timeline]');
        await expect(timeline).toBeVisible();
        const reminder = await backend.mutation(api.tasks.create, { title:"QA timezone deadline", date:"2027-04-04", deadline:clock.today, time:"10:00", reminders:[{type:"at_start"}] });
        expect(reminder.deadline).toBe(clock.today);
        console.log(JSON.stringify({ width, zone, today:clock.today, now:clock.minutes, dstDate:reminder.date, expectedReminder:reminderTimes(reminder, zone, Date.now()) }));
      }
    } finally { await context.setOffline(false); await fixture.cleanup(); }
  });
  test(`QA15 sample onboarding and scroll accessibility ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await disposable(page, true);
    try {
      await page.getByRole("button", { name:"Use sample data", exact:true }).click();
      await expect(page).toHaveURL(/\/app$/);
      await expect.poll(() => fixture.backend.query(api.tasks.list, {})).not.toEqual([]);
      await fixture.backend.mutation(api.profiles.update, { patch:{ dayStartHour:0, dayEndHour:24 } });
      await page.reload();
      await expect(page.locator('[data-loading="false"]')).toBeVisible();
      expect(await axe(page)).toEqual([]);
    } finally { await fixture.cleanup(); }
  });
}
