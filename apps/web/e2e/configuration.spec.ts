import { test, expect } from "@playwright/test";
import { addDays } from "@kriyan/core";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { backendFor } from "./backend";
test.describe.configure({ mode: "serial" });
test("goals save number progress, milestones and task progress", async ({
  page,
}) => {
  await page.goto("/app?view=goals");
  await expect(
    page.getByRole("heading", { name: "Goals", exact: true }),
  ).toBeVisible();
  const target = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  async function create(title: string, kind: string) {
    await page
      .getByRole("button", { name: "Add goal", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Add goal", exact: true });
    await dialog.getByLabel("Goal title").fill(title);
    await dialog.getByLabel("Target date").fill(addDays(target, 14));
    await dialog.getByLabel("Measure progress").selectOption(kind);
    if (kind === "number") {
      await dialog.getByLabel("Target value").fill("10");
      await dialog.getByLabel("Current value").fill("2");
      await dialog.getByLabel("Unit", { exact: true }).fill("books");
    }
    await dialog.getByRole("button", { name: "Add goal", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    return page.locator("section").filter({ hasText: title });
  }
  const number = await create("Read ten books", "number");
  await expect(number.getByText("2 books", { exact: true })).toBeVisible();
  await number.getByLabel("Current value for Read ten books").fill("3");
  await number.getByRole("button", { name: "Update progress" }).click();
  await expect(number.getByText("3 books", { exact: true })).toBeVisible();
  const milestones = await create("Finish the launch plan", "milestones");
  await milestones.getByRole("button", { name: "Edit milestones" }).click();
  for (const title of ["Write the plan", "Review the plan"]) {
    await milestones.getByLabel("New milestone", { exact: true }).fill(title);
    await milestones.getByRole("button", { name: "Add milestone" }).click();
    await expect(
      milestones.getByRole("checkbox", {
        name: `Complete milestone: ${title}`,
      }),
    ).toBeVisible();
  }
  await milestones
    .getByRole("checkbox", { name: "Complete milestone: Write the plan" })
    .click();
  await expect(milestones.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  await create("Finish the course", "tasks");
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.locator('[data-loading="false"]')).toBeVisible();
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Search and commands" });
  await palette.getByRole("combobox", { name: "Search" }).fill("Gym");
  await expect(palette.getByRole("button", { name: /^Gym/ })).toBeVisible();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Task details" });
  await panel
    .getByLabel("Goal", { exact: true })
    .selectOption({ label: "Finish the course" });
  await expect(panel.getByLabel("Goal", { exact: true })).toHaveValue(/.+/);
  const goalId = await panel.getByLabel("Goal", { exact: true }).inputValue();
  await panel
    .getByRole("checkbox", { name: "Mark as done: Gym", exact: true })
    .click();
  await expect(
    panel.getByRole("checkbox", { name: "Mark as not done: Gym", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  const backend = await backendFor(page);
  const id = new URL(page.url()).searchParams.get("task");
  if (!id) throw new Error("Task URL has no task ID.");
  await expect
    .poll(() => backend.query(api.tasks.get, { id: id as Id<"tasks"> }))
    .toMatchObject({ status: "completed", goalId });
  await expect
    .poll(
      async () =>
        (await backend.query(api.goals.list, {})).find((g) => g._id === goalId)
          ?.linkedTasks,
    )
    .toEqual({ done: 1, total: 1 });
  await panel.getByRole("button", { name: "Close task details" }).click();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(
    page
      .locator("section")
      .filter({ hasText: "Finish the course" })
      .getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "100");
});
test("settings saves preferences and enforces the area deletion refusal", async ({
  page,
}) => {
  await page.goto("/app/settings");
  const areas = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Areas", exact: true }) });
  await areas.getByLabel("New area name").fill("Work");
  await areas.getByRole("button", { name: "Add area", exact: true }).click();
  await expect(areas.getByLabel("Area name", { exact: true })).toHaveCount(4);
  const row = areas.locator("form").nth(3);
  await row.getByLabel("Area name", { exact: true }).fill("Work plans");
  await row.getByRole("combobox", { name: "Area colour", exact: true }).selectOption("orange");
  await row.getByRole("button", { name: "Save area" }).click();
  await expect(
    row.getByRole("button", { name: "Move Work plans up" }),
  ).toBeVisible();
  const projects = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Projects and courses",
      exact: true,
    }),
  });
  await projects.getByLabel("New project or course").fill("Project review");
  await projects
    .getByRole("combobox", { name: "Area", exact: true })
    .selectOption({ label: "Work plans" });
  await projects
    .getByRole("button", { name: "Add project", exact: true })
    .click();
  await expect(projects.getByLabel("Name", { exact: true })).toHaveValue(
    "Project review",
  );
  await row.getByRole("button", { name: "Delete area" }).click();
  await expect(areas.getByRole("alert")).toContainText("Area is in use");
  await projects.getByRole("button", { name: "Delete project" }).click();
  await expect(projects.getByLabel("Name", { exact: true })).toHaveCount(0);
  await row.getByRole("button", { name: "Move Work plans up" }).click();
  await expect(areas.getByLabel("Area name", { exact: true }).nth(2)).toHaveValue("Work plans");
  await areas.getByRole("button", { name: "Move Work plans down" }).click();
  await expect(areas.getByLabel("Area name", { exact: true }).nth(3)).toHaveValue("Work plans");
  await row.getByRole("button", { name: "Delete area" }).click();
  await expect(areas.getByLabel("Area name", { exact: true })).toHaveCount(3);
  const meetings = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Classes and fixed meetings", exact: true }),
  });
  await meetings.getByLabel("New class or meeting").fill("Weekly review");
  await meetings.getByRole("checkbox", { name: "Mon", exact: true }).check();
  await meetings.getByLabel("Location").fill("Library");
  await meetings.getByRole("button", { name: "Add meeting" }).click();
  await expect(meetings.getByLabel("Meeting title")).toHaveValue("Weekly review");
  const meeting = meetings.locator("form").first();
  await meeting.getByLabel("Meeting title").fill("Course review");
  await meeting.getByRole("button", { name: "Save meeting" }).click();
  await expect(meeting.getByRole("status")).toContainText("Changes saved.");
  await meeting.getByRole("button", { name: "Delete meeting" }).click();
  await expect(meetings.getByLabel("Meeting title")).toHaveCount(0);
  const habits = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Habits", exact: true }),
  });
  await habits.getByLabel("New habit").fill("Read daily");
  await habits.getByRole("button", { name: "Add habit" }).click();
  await expect(habits.getByLabel("Habit title")).toHaveValue("Read daily");
  const habit = habits.locator("form").first();
  await habit.getByLabel("Weekly target").fill("5");
  await habit.getByRole("button", { name: "Save habit" }).click();
  await expect(habit.getByRole("status")).toContainText("Changes saved.");
  await habit.getByRole("button", { name: "Delete habit" }).click();
  await expect(habits.getByLabel("Habit title")).toHaveCount(0);
  await page.getByLabel("Daily capacity in minutes").fill("480");
  await page.getByLabel("Day start hour").fill("6");
  await page.getByLabel("Day end hour").fill("22");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved." }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Daily capacity in minutes")).toHaveValue("480");
  await expect(page.getByLabel("Day start hour")).toHaveValue("6");
  await expect(page.getByLabel("Day end hour")).toHaveValue("22");
  await expect(
    page.getByRole("heading", { name: "Account and security" }),
  ).toBeVisible();
});
