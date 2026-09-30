import { mkdir } from "node:fs/promises";
import { test, expect, type Locator, type Page } from "@playwright/test";

const directory = "../../.agents/screenshots/09";
const fixedTime = new Date("2026-09-30T15:45:00Z");
const row = (panel: Locator, id: string) =>
  panel.locator(`[data-property="${id}"]`);
const errorLog = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  errorLog.set(page, errors);
});
test.afterEach(async ({ page }) => {
  expect(errorLog.get(page)).toEqual([]);
});
async function ready(page: Page, view = "day") {
  await page.clock.setFixedTime(fixedTime);
  await page.goto(`/demo?view=${view}`);
  await expect(
    page.getByRole("heading", {
      name:
        view === "day" || view === "list"
          ? "Wednesday"
          : view === "week"
            ? "Week"
            : "Goals",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function capture(page: Page, name: string, width: number) {
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `${directory}/${name}-${width}.png`,
    animations: "disabled",
  });
}
async function dialogFits(dialog: Locator) {
  await dialog.evaluate((element) =>
    element.getAnimations().forEach((animation) => animation.finish()),
  );
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  const viewport = await dialog
    .page()
    .evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
    viewport.height,
  );
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test.describe(`${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      isMobile: width === 390,
      hasTouch: width === 390,
      timezoneId: "America/New_York",
    });
    test("capture all nine demo states and check dialog geometry", async ({
      page,
    }) => {
      await mkdir(directory, { recursive: true });
      await ready(page);
      await expect(
        page.getByRole("button", { name: "School", exact: true }),
      ).toHaveCSS("height", width === 390 ? "44px" : "32px");
      await expect(
        page.getByRole("button", { name: "Today", exact: true }),
      ).toHaveCSS("height", width === 390 ? "44px" : "32px");
      await expect(
        page.getByRole("button", { name: "Ctrl K", exact: true }),
      ).toHaveCount(0);
      if (width === 390) {
        const title = await page
          .getByRole("heading", { name: "Wednesday" })
          .boundingBox();
        const navigation = await page
          .getByRole("button", { name: "Today", exact: true })
          .boundingBox();
        expect(Math.abs((title?.y ?? 0) - (navigation?.y ?? 0))).toBeLessThan(
          20,
        );
      }
      await capture(page, "day", width);
      // Open the business task from List, then return to Day without losing its selection.
      await page.getByRole("button", { name: "List", exact: true }).click();
      await page
        .getByRole("button", {
          name: "Open task: Ship the update_task signing fix",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Task details" }),
      ).toBeVisible();
      await expect(page).toHaveURL(/task=demo-3/);
      const taskId = new URL(page.url()).searchParams.get("task");
      await page.goto(`/demo?task=${taskId}`);
      const panel = page.getByRole("dialog", { name: "Task details" });
      await row(panel, "length").click();
      await expect(
        panel.getByRole("group", { name: "Length editor" }),
      ).toBeVisible();
      await dialogFits(panel);
      await capture(page, "task-panel-length", width);
      await panel.getByRole("button", { name: "Close task details" }).click();
      for (const view of ["list", "week", "goals"] as const) {
        await page
          .getByRole("button", {
            name: view[0].toUpperCase() + view.slice(1),
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(new RegExp(`view=${view}`));
        await expect(
          page.getByRole("heading", {
            name:
              view === "list"
                ? "Wednesday"
                : view === "week"
                  ? "Week"
                  : "Goals",
            exact: true,
          }),
        ).toBeVisible();
        await capture(page, view, width);
      }
      await page
        .getByRole("button", { name: "Launch Kriyan on mobile", exact: true })
        .click();
      const goal = page.getByRole("dialog", { name: "Goal details" });
      await expect(row(goal, "measure")).toContainText("Number");
      await dialogFits(goal);
      await capture(page, "goal-panel", width);
      await goal.getByRole("button", { name: "Close goal details" }).click();
      await page
        .getByRole("button", { name: "Add task", exact: true })
        .first()
        .click();
      const quick = page.getByRole("dialog", { name: "Add a task" });
      await quick.getByRole("textbox").fill("econ essay fri 5pm #econ 45m");
      await expect(quick.getByRole("textbox")).toHaveCSS(
        "outline-style",
        "none",
      );
      await dialogFits(quick);
      await capture(page, "quick-add", width);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+k");
      const palette = page.getByRole("dialog", { name: "Search and commands" });
      await expect(palette).toBeVisible();
      await dialogFits(palette);
      await capture(page, "palette", width);
      await page.keyboard.press("Escape");
      await page.keyboard.press("?");
      const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
      await expect(help).toBeVisible();
      await expect(help.locator("dt").filter({ hasText: "←" })).toHaveText(
        "←→",
      );
      await dialogFits(help);
      const close = await help
        .getByRole("button", { name: "Close shortcuts" })
        .boundingBox();
      const heading = await help.getByRole("heading").boundingBox();
      expect(close?.x).toBeGreaterThan(
        (heading?.x ?? 0) + (heading?.width ?? 0),
      );
      await capture(page, "shortcuts", width);
    });

    test("property rows save changes, disclose date fields and close one level at a time", async ({
      page,
    }) => {
      await ready(page, "list");
      const trigger = page.getByRole("button", {
        name: "Open task: Ship the update_task signing fix",
        exact: true,
      });
      await trigger.focus();
      await page.keyboard.press("l");
      const panel = page.getByRole("dialog", { name: "Task details" });
      await expect(row(panel, "length")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      if (width === 1440)
        await expect(
          panel
            .getByRole("group", { name: "Length editor" })
            .getByRole("button", { name: "None", exact: true }),
        ).toBeFocused();
      await panel.getByRole("button", { name: "45m", exact: true }).click();
      await expect(row(panel, "length")).toContainText("45m");
      await expect(row(panel, "time")).toContainText("14:30 to 15:15");
      await row(panel, "day").click();
      await expect(row(panel, "length")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(panel.locator('input[type="date"]')).toHaveCount(0);
      await panel
        .getByRole("button", { name: "Pick a day", exact: true })
        .click();
      await expect(
        panel.getByLabel("Pick a day", { exact: true }),
      ).toBeVisible();
      await panel
        .getByLabel("Notes", { exact: true })
        .fill("Review the signing test before the release.");
      await row(panel, "repeat").click();
      await panel.getByRole("button", { name: "Weekly", exact: true }).click();
      await panel.getByRole("button", { name: "Monday", exact: true }).click();
      await panel
        .getByRole("button", { name: "Thursday", exact: true })
        .click();
      await expect(row(panel, "repeat")).toContainText(
        "Every week on Mon and Thu",
      );
      await row(panel, "reminders").click();
      await panel
        .getByRole("button", { name: "10 min before", exact: true })
        .click();
      await panel
        .getByRole("button", { name: "At start", exact: true })
        .click();
      await expect(row(panel, "reminders")).toContainText(
        "10 min before, at start",
      );
      await page.keyboard.press("Escape");
      await expect(panel).toBeVisible();
      await expect(row(panel, "reminders")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await row(panel, "area").focus();
      await page.keyboard.press("ArrowDown");
      await expect(row(panel, "project")).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      await expect(row(panel, "area")).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect(panel).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await page.keyboard.press("m");
      await expect(row(panel, "time")).toHaveAttribute("aria-expanded", "true");
      if (width === 1440)
        await expect(panel.getByLabel("Move to")).toBeFocused();
      await expect(panel.getByLabel("Notes", { exact: true })).toHaveValue(
        "Review the signing test before the release.",
      );
    });
  });
}
