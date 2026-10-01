import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { api } from "@kriyan/backend/convex/_generated/api";
import { backendFor } from "./backend";

test.describe.configure({ mode: "serial" });
const directory = "../../.agents/screenshots/14";
const sizes = [[1440, 900], [390, 844]] as const;
async function capture(page: Page, name: string, width: number) {
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${directory}/${name}-${width}.png`, animations: "disabled" });
}
async function ready(page: Page, view = "day") {
  await page.goto(`/app?view=${view}`);
  await expect(page.locator('.content, [aria-busy="false"]').first()).toBeVisible();
  if (view === "day") await expect(page.locator('[data-loading="false"]')).toBeVisible();
  else await expect(page.getByRole("heading", { name: view === "goals" ? "Goals" : view === "week" ? "Week" : "Wednesday", exact: true })).toBeVisible();
}

test("fresh account empty views, goal validation and number dialog at both sizes", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-09-30T13:00:00Z"));
  await page.goto("/app");
  const backend = await backendFor(page);
  await backend.mutation(api.profiles.completeOnboarding, {});
  await backend.mutation(api.profiles.update, { patch: { timezone: "America/New_York" } });
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ storageState: "e2e/.auth/states-user.json", viewport: { width, height }, hasTouch: width === 390, isMobile: width === 390, timezoneId: "America/New_York" });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2026-09-30T13:00:00Z"));
    await ready(page);
    await expect(page.getByText("Your day starts here.", { exact: true })).toBeVisible();
    await expect(page.getByText("Nothing planned yet.", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Tasks for today without a time wait here.", { exact: true })).toBeVisible();
    await expect(page.getByText("Tasks without a day land here until you schedule them.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
    await capture(page, "empty-day", width);
    await page.clock.setFixedTime(new Date("2026-09-30T05:00:00Z"));
    await ready(page);
    await expect(page.locator('[data-first-run="true"]')).toHaveCSS("top", width === 1440 ? "112px" : "124px");
    await page.clock.setFixedTime(new Date("2026-09-30T13:00:00Z"));
    await ready(page);
    if (width === 390) {
      const nav = page.getByRole("navigation", { name: "Main", exact: true });
      await expect(nav.locator("button:visible")).toHaveCount(5);
      await expect(nav.getByRole("button", { name: "Settings" })).not.toBeVisible();
      await expect(page.locator("header").getByRole("button", { name: "Settings", exact: true })).toBeVisible();
    }
    await ready(page, "list");
    await expect(page.getByText("Nothing planned for today.", { exact: true })).toBeVisible();
    await capture(page, "empty-list", width);
    await ready(page, "week");
    await expect(page.getByText("Nothing planned this week.", { exact: true })).toBeVisible();
    await expect(page.getByText("Free", { exact: true })).toHaveCount(0);
    const columns = page.locator('section').filter({ has: page.getByRole("button", { name: /^Open (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/ }) });
    await expect(columns).toHaveCount(7);
    for (const column of await columns.all()) await expect(column).toHaveCSS("height", width === 390 ? "56px" : "120px");
    await capture(page, "empty-week", width);
    await ready(page, "goals");
    await expect(page.getByRole("heading", { name: "No goals yet", exact: true })).toBeVisible();
    await capture(page, "empty-goals", width);
    await page.getByRole("button", { name: "Add your first goal", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add goal", exact: true });
    await expect(dialog.getByLabel("Goal title")).toBeFocused();
    await expect(dialog.getByLabel("Goal title")).toHaveAttribute("placeholder", "Name the goal");
    await expect(dialog.locator('input[type="date"]')).toHaveCount(0);
    await expect(dialog.locator("form")).toHaveAttribute("novalidate", "");
    await capture(page, "goal-empty", width);
    await dialog.getByRole("button", { name: "No date", exact: true }).click();
    await dialog.getByRole("button", { name: "Add goal", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Give the goal a name.");
    await expect(dialog.getByLabel("Goal title")).toHaveAttribute("aria-invalid", "true");
    await capture(page, "goal-validation", width);
    await dialog.getByRole("button", { name: "A number", exact: true }).click();
    await dialog.getByLabel("Target value").fill("3.8");
    await dialog.getByLabel("Unit", { exact: true }).fill("GPA");
    await capture(page, "goal-number", width);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Add your first goal", exact: true })).toBeFocused();
    await context.close();
  }
});

test("task example is prefilled, first task removes prompt permanently and hint is local to Day", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date("2026-09-30T13:00:00Z"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  await page.getByRole("button", { name: "lunch with Priya 1pm", exact: true }).click();
  const quick = page.getByRole("dialog", { name: "Add a task" });
  await expect(quick.getByLabel("Task", { exact: true })).toHaveValue("lunch with Priya 1pm");
  await quick.getByLabel("Task", { exact: true }).fill("Call Amma today");
  await quick.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(quick).not.toBeVisible();
  await expect(page.getByText("Your day starts here.", { exact: true })).toHaveCount(0);
  const backend = await backendFor(page);
  await expect.poll(async () => (await backend.query(api.profiles.get, {}))?.onboardingDraft?.["planner.firstTaskAdded"]).toBe("1");
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ storageState: "e2e/.auth/states-user.json", viewport: { width, height }, hasTouch: width === 390, isMobile: width === 390, timezoneId: "America/New_York" });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2026-09-30T13:00:00Z"));
    await ready(page);
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toBeVisible();
    if (width === 390) await expect(page.getByText("Tap a task to give it a time.", { exact: true })).toBeVisible();
    await capture(page, "day-hint", width);
    for (const view of ["list", "week", "goals"]) {
      await ready(page, view);
      await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
    }
    await context.close();
  }
  await ready(page);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
  const tasks = await backend.query(api.tasks.list, {});
  for (const task of tasks) await backend.mutation(api.tasks.remove, { id: task._id });
  await page.reload();
  await expect(page.locator('[data-loading="false"]')).toBeVisible();
  await expect(page.getByText("Your day starts here.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Nothing planned.", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "School", exact: true }).click();
  await expect(page.getByText("Nothing in School.", { exact: true }).first()).toBeVisible();
});

test("goal examples prefill all measures and each measure persists through the shared dialog", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, "goals");
  const backend = await backendFor(page);
  const examples = [
    ["Finish the semester with a 3.8 GPA", "School", "A number", "3.8", "GPA"],
    ["Launch the app by December", "Business", "Milestones", null, null],
    ["Run a 10k", "Life", "A number", "10", "km"],
  ] as const;
  for (const [title, area, measure, target, unit] of examples) {
    await page.getByRole("button", { name: title, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add goal", exact: true });
    await expect(dialog.getByLabel("Goal title")).toHaveValue(title);
    await expect(dialog.getByRole("button", { name: area, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: measure, exact: true })).toHaveAttribute("aria-pressed", "true");
    if (target && unit) {
      await expect(dialog.getByLabel("Target value")).toHaveValue(target);
      await expect(dialog.getByLabel("Unit", { exact: true })).toHaveValue(unit);
    }
    await page.keyboard.press("Escape");
  }
  for (const [kind, label] of [["tasks", "Tasks done"], ["number", "A number"], ["milestones", "Milestones"]] as const) {
    await page.getByRole("button", { name: "Add goal", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add goal", exact: true });
    await dialog.getByLabel("Goal title").fill(`States ${kind} goal`);
    await dialog.getByRole("button", { name: label, exact: true }).click();
    if (kind === "number") {
      await dialog.getByLabel("Target value").fill("-1");
      await dialog.getByRole("button", { name: "Add goal", exact: true }).click();
      await expect(dialog.getByRole("alert")).toHaveText("Enter a target number greater than zero.");
      await dialog.getByLabel("Target value").fill("10");
      await dialog.getByLabel("Unit", { exact: true }).fill("books");
    }
    await dialog.getByRole("button", { name: "Pick a day", exact: true }).click();
    await dialog.getByLabel("Target date", { exact: true }).fill("2026-12-30");
    await dialog.getByRole("button", { name: "Add goal", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    if (kind === "milestones") {
      const panel = page.getByRole("dialog", { name: "Goal details" });
      await expect(panel.getByLabel("Add a milestone")).toBeFocused();
      await panel.getByLabel("Add a milestone").fill("Review the plan");
      await panel.getByLabel("Add a milestone").press("Enter");
      await expect(panel.getByLabel("Milestone title")).toHaveValue("Review the plan");
      await panel.getByRole("button", { name: "Close goal details" }).click();
    }
    await expect.poll(async () => (await backend.query(api.goals.list, {})).find((goal) => goal.title === `States ${kind} goal`)).toMatchObject({ metric: { kind }, targetDate: "2026-12-30" });
  }
});

test("unknown routes return designed HTTP 404 on both hosts", async ({ page, request }) => {
  test.setTimeout(90_000);
  for (const host of ["kriyan.app", "app.kriyan.app"]) {
    const response = await request.get("/states-missing-page", { headers: { Host: host } });
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain("This page does not exist.");
    expect(html).toContain(host === "app.kriyan.app" ? '>Open Kriyan</a>' : '>Go to the home page</a>');
  }
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const path of ["/states-missing-page", "/app/states-missing-page"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "This page does not exist.", exact: true })).toBeVisible();
      const first = page.locator('main > div > div > a').first();
      await expect(first).toHaveText(path.startsWith("/app/") ? "Open Kriyan" : "Go to the home page");
      await capture(page, path.startsWith("/app/") ? "404-app" : "404-home", width);
    }
  }
});
