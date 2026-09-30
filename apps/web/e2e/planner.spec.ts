import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { addDays } from "@kriyan/core";
test.describe.configure({ mode: "serial" });
async function today(page: Page) {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}
async function add(page: Page, text: string) {
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add a task" });
  await dialog.getByRole("textbox").fill(text);
  await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
test("sign in and complete onboarding with the default three areas", async ({
  page,
}) => {
  await page.goto("/app/welcome");
  await expect(
    page.locator("details").filter({
      has: page.locator("summary").filter({ hasText: "Edit area" }),
    }),
  ).toHaveCount(3);
  await mkdir("../../.agents/screenshots/03c", { recursive: true });
  for (let step = 1; step <= 5; step++) {
    await expect(
      page.getByText(`Step ${step} of 5`, { exact: true }),
    ).toBeVisible();
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator("main").evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `../../.agents/screenshots/03c/welcome-step-${step}-${width}.png`,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    if (step < 5)
      await page
        .getByRole("button", {
          name: step === 1 ? "Continue setup" : "Skip step",
        })
        .click();
  }
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/app$/);
  for (const area of ["School", "Business", "Life"])
    await expect(
      page.getByRole("button", { name: area, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByText("Drag a task from the tray", { exact: false }),
  ).toBeVisible();
});
test("quick add gym tomorrow at 07:00 without inventing a length", async ({
  page,
}) => {
  await page.goto("/app");
  await add(page, "gym tomorrow 7am");
  await expect(
    page.getByRole("status").filter({ hasText: "Added: Tomorrow at 07:00" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next day" }).click();
  const block = page.locator('[data-drag="move"]').filter({ hasText: "gym" });
  await expect(block).toBeVisible();
  await expect(block.locator("time")).toHaveText("07:00");
});
test("setting a 45 minute length enlarges the block and shows 07:45", async ({
  page,
}) => {
  await page.goto(`/app?date=${addDays(await today(page), 1)}`);
  const block = page.locator('[data-drag="move"]').filter({ hasText: "gym" });
  const before = await block.boundingBox();
  await block.click();
  const panel = page.getByRole("dialog", { name: "Task details" });
  await panel.locator('[data-property="length"]').click();
  await panel.getByRole("button", { name: "45m", exact: true }).click();
  await panel.getByRole("button", { name: "Close task details" }).click();
  await expect(block.locator("time")).toHaveText("07:00 to 07:45");
  await expect
    .poll(async () => (await block.boundingBox())?.height ?? 0)
    .toBeGreaterThan(before?.height ?? 0);
});
test("complete a task and undo returns it", async ({ page }) => {
  await page.goto(`/app?date=${addDays(await today(page), 1)}`);
  const checkbox = page.getByRole("checkbox", {
    name: "Mark as done: Gym",
    exact: true,
  });
  await checkbox.click();
  await expect(
    page.getByRole("checkbox", { name: "Mark as not done: Gym", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(checkbox).toHaveAttribute("aria-checked", "false");
});
test("mouse drag schedules a tray card onto the timeline", async ({ page }) => {
  await page.goto("/app");
  await add(page, "E2E tray task");
  const card = page
    .locator('[data-drag="place"]:not([data-task^="optimistic-"])')
    .filter({ hasText: "E2E tray task" });
  const grid = page.locator("[data-timeline]");
  await expect(card).toBeVisible();
  await expect(grid).toBeVisible();
  const from = await card.boundingBox(),
    to = await grid.boundingBox();
  if (!from || !to) throw new Error("Tray card or timeline has no bounds.");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, Math.max(180, to.y + 200), {
    steps: 20,
  });
  await page.mouse.up();
  await expect(
    page.locator('[data-drag="move"]').filter({ hasText: "E2E tray task" }),
  ).toBeVisible();
});
test("command palette finds a title and opens its task", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator('[data-loading="false"]')).toBeVisible();
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Search and commands" });
  await palette.getByRole("combobox", { name: "Search" }).fill("E2E tray task");
  await expect(
    palette.getByRole("button", { name: /^E2E tray task/ }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("dialog", { name: "Task details" })
      .getByRole("textbox", { name: "Task title" }),
  ).toHaveValue("E2E tray task");
});
test("reload preserves view, date, area and open task in the URL", async ({
  page,
}) => {
  const date = addDays(await today(page), 1);
  await page.goto(`/app?view=list&date=${date}&area=life`);
  // gym uses the active quick-add default area, which is Life.
  await page
    .getByRole("button", { name: "Open task: Gym", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Task details" }),
  ).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("task"))
    .toBeTruthy();
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("button", { name: "List", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("dialog", { name: "Task details" })
      .getByRole("textbox", { name: "Task title" }),
  ).toHaveValue("Gym");
});
