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
test("onboarding saves answers, resumes by URL and finishes with real tasks", async ({
  page,
}) => {
  await page.goto("/app/welcome");
  await expect(
    page.getByRole("heading", { name: "What do you plan for?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Skip", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Business", exact: true }).click();
  await page.getByLabel("Area name", { exact: true }).fill("Work");
  await page.getByLabel("Area name", { exact: true }).press("Enter");
  await expect(
    page.getByRole("button", { name: "Work", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/step=2/);
  await page.getByLabel("New project or course in School").fill("CS 201");
  await page.getByLabel("New project or course in School").press("Enter");
  await expect(page.getByText("CS 201", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Step 2 of 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("New class or meeting").fill("CS 201 lecture");
  await page.getByRole("button", { name: "Tue", exact: true }).click();
  await page.getByRole("button", { name: "Thu", exact: true }).click();
  await page.getByLabel("Start", { exact: true }).fill("10");
  await page.getByLabel("End", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Add class", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "End time must be after the start." }),
  ).toBeVisible();
  await page.getByLabel("End", { exact: true }).fill("1115");
  await page.getByLabel("Place, optional").fill("Room 4.12");
  await page.getByRole("button", { name: "Add class", exact: true }).click();
  await expect(
    page.getByText("CS 201 lecture", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Goal title").fill("Read ten books");
  await page.getByRole("button", { name: "In 3 months", exact: true }).click();
  await page.getByRole("button", { name: "A number", exact: true }).click();
  await page.getByLabel("Unit", { exact: true }).fill("books");
  await page.getByLabel("Unit", { exact: true }).press("Tab");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Task", { exact: true })
    .fill("Review notes today 14:00 1h");
  await page.getByLabel("Task", { exact: true }).press("Enter");
  await expect(
    page.getByText("Review notes", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Task", { exact: true }).fill("Call family");
  await page.getByLabel("Task", { exact: true }).press("Enter");
  await expect(page.locator('aside[aria-hidden="true"][inert]')).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open my planner", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
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
    palette.getByRole("option", { name: /^E2E tray task/ }),
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
