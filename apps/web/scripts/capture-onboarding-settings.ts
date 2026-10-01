import { expect } from "@playwright/test";
import { createTestUser, deleteTestUser, resolveUser } from "../../../.agents/skills/test-kriyan/scripts/lib/users.mjs";
import { prepareClerk, launchBrowser, signInPage } from "../../../.agents/skills/test-kriyan/scripts/lib/browser.mjs";
import { serviceCall } from "../../../.agents/skills/test-kriyan/scripts/lib/service.mjs";
import nextEnv from "@next/env";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { api } from "@kriyan/backend/convex/_generated/api";
import { backendFor } from "../e2e/backend";
import { addDays, localClock } from "../../../packages/core/src/index";
nextEnv.loadEnvConfig(process.cwd());
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(
  "../../.agents/playwright-browsers",
);
await prepareClerk();
const previous: unknown = await readFile(
  "e2e/.auth/disposable-user.json",
  "utf8",
)
  .then(JSON.parse)
  .catch(() => null);
const user =
  previous &&
  typeof previous === "object" &&
  "id" in previous &&
  typeof previous.id === "string"
    ? await resolveUser(previous.id)
    : await createTestUser({ tag: "brief12" });
const email = user.email;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3400";
const directory = resolve("../../.agents/screenshots/12");
await mkdir(directory, { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1440, height: 900 },
  timezoneId: "America/New_York",
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [],
  captures: string[] = [],
  checks: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let backend: Awaited<ReturnType<typeof backendFor>> | undefined;
try {
  await signInPage(page, email, { base: baseURL, destination: "/app/welcome" });
  await expect(
    page.getByRole("heading", { name: "What do you plan for?" }),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({
    timeout: 60_000,
  });
  backend = await backendFor(page);
  const today = localClock(new Date(), "America/New_York").today;
  const areas = await backend.query(api.areas.list, {});
  const [school, work, life] = areas;
  if (!school || !work || !life)
    throw new Error("Expected the three default areas.");
  await backend.mutation(api.areas.update, {
    id: work._id,
    patch: { name: "Work" },
  });
  async function capture(name: string) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      const phoneContext = width === 390 ? await browser.newContext({
        baseURL, viewport: { width, height },
        timezoneId: "America/New_York", reducedMotion: "reduce", hasTouch: true, isMobile: true,
        storageState: await context.storageState(),
      }) : undefined;
      const capturePage = phoneContext ? await phoneContext.newPage() : page;
      if (phoneContext) {
        capturePage.on("pageerror", (e) => errors.push(e.message));
        await capturePage.goto(page.url(), { timeout: 120_000 });
        await expect(capturePage.locator('main[aria-busy="false"]')).toBeVisible();
        if (name === "welcome-step-1" || name === "settings-areas")
          await capturePage.getByRole("button", { name: "Work", exact: true }).click();
        if (name === "settings-classes")
          await capturePage.getByRole("button", { name: "CS 201 lecture", exact: true }).click();
        if (name === "settings-planning")
          await capturePage.locator('[data-property="capacity"]').click();
      } else await capturePage.setViewportSize({ width, height });
      await capturePage.evaluate(() => document.fonts.ready);
      await capturePage.mouse.move(0, 0);
      await expect(capturePage.locator('main[aria-busy="false"]')).toBeVisible();
      const overflow = await capturePage.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow) throw new Error(`Horizontal overflow: ${name} at ${width}`);
      await capturePage.screenshot({
        path: `${directory}/${name}-${width}.png`,
        animations: "disabled",
      });
      captures.push(`${name}-${width}.png`);
      if (width === 390 && name.startsWith("welcome")) {
        await capturePage
          .locator('aside[aria-hidden="true"]')
          .scrollIntoViewIfNeeded();
        await expect(capturePage.locator('aside[aria-hidden="true"]')).toHaveCSS(
          "height",
          "260px",
        );
        await capturePage.screenshot({
          path: `${directory}/${name}-preview-390.png`,
          animations: "disabled",
        });
        captures.push(`${name}-preview-390.png`);
        await capturePage.evaluate(() => window.scrollTo(0, 0));
      }
      await phoneContext?.close();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await capture("welcome-step-1");
  await serviceCall(api.service.projectsCreate, user.id, "projects.create", {
    areaId: school._id,
    name: "CS 201",
    kind: "course",
  });
  await serviceCall(api.service.projectsCreate, user.id, "projects.create", {
    areaId: school._id,
    name: "Calculus II",
    kind: "course",
  });
  await serviceCall(api.service.projectsCreate, user.id, "projects.create", {
    areaId: work._id,
    name: "Hartley website",
    kind: "project",
  });
  await page.goto("/app/welcome?step=2");
  await capture("welcome-step-2");
  await serviceCall(api.service.eventsCreate, user.id, "events.create", {
    areaId: school._id,
    title: "CS 201 lecture",
    weekdays: [2, 4],
    startTime: "10:00",
    endTime: "11:15",
    location: "Room 4.12",
    fromDate: today,
  });
  await page.goto("/app/welcome?step=3");
  await capture("welcome-step-3");
  await serviceCall(api.service.goalsCreate, user.id, "goals.create", {
    areaId: life._id,
    title: "Read ten books",
    startDate: today,
    targetDate: addDays(today, 90),
    metric: { kind: "number", current: 0, target: 10, unit: "books" },
  });
  await page.goto("/app/welcome?step=4");
  await capture("welcome-step-4");
  await serviceCall(api.service.tasksQuickAdd, user.id, "tasks.quickAdd", {
    text: "Problem set 4 today 14:00 1h #cs201",
    today,
  });
  await serviceCall(api.service.tasksQuickAdd, user.id, "tasks.quickAdd", {
    text: "Gym tomorrow 7am",
    today,
  });
  await serviceCall(api.service.tasksQuickAdd, user.id, "tasks.quickAdd", {
    text: "Call Amma today",
    today,
  });
  await page.goto("/app/welcome?step=5");
  await capture("welcome-step-5");
  // Validate the live endpoints without pretending URL navigation proves resume.
  try {
    await backend.mutation(api.profiles.saveOnboarding, { step: 5 });
    checks.push("Hosted setup resume endpoint available.");
  } catch (e) {
    checks.push(
      `Hosted setup resume unavailable: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  try {
    const ordered = await backend.query(api.areas.list, {});
    await backend.mutation(api.areas.reorder, { ids: ordered.map((area) => area._id) });
    checks.push("Hosted area reorder endpoint available.");
  } catch (e) {
    checks.push(`Hosted area reorder unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  const questionWidth = await page.locator('section[aria-labelledby="setup-heading"]').evaluate((element) => element.getBoundingClientRect().width);
  if (questionWidth !== 520) throw new Error(`Desktop question column is ${questionWidth}px.`);
  checks.push("Question column is 520px at 1024px; phone previews are 260px; no horizontal overflow at either capture size.");
  await backend.mutation(api.profiles.completeOnboarding, {});
  await serviceCall(api.service.habitsCreate, user.id, "habits.create", {
    areaId: life._id,
    title: "Read daily",
    weeklyTarget: 5,
  });
  for (const section of [
    "areas",
    "projects",
    "classes",
    "habits",
    "planning",
    "reset",
  ]) {
    await page.goto(`/app/settings/${section}`, { timeout: 120_000 });
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible();
    if (section === "areas")
      await page.getByRole("button", { name: "Work", exact: true }).click();
    if (section === "classes")
      await page
        .getByRole("button", { name: "CS 201 lecture", exact: true })
        .click();
    if (section === "planning")
      await page.locator('[data-property="capacity"]').click();
    await capture(`settings-${section}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/settings");
  await capture("settings-index");
  checks.push("390px captures use a signed-in mobile Chromium context with a coarse pointer and touch enabled.");
  console.log(
    `Captured ${captures.length} signed-in screens with real disposable-user data.`,
  );
} finally {
  await page.close();
  await context.close();
  await browser.close();
  await deleteTestUser(user.id);
  if (previous) await unlink("e2e/.auth/disposable-user.json").catch(() => {});
  await writeFile(
    `${directory}/capture-results.json`,
    JSON.stringify(
      {
        captures,
        errors,
        checks,
        source:
          "Signed in with a disposable development Clerk user. Existing hosted mutations supplied realistic records. Direct step URLs used for screenshot coverage; resume is checked separately.",
        deletedDisposableUser: true,
      },
      null,
      2,
    ),
  );
}
