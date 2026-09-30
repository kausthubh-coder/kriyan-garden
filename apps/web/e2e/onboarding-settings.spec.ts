import { test, expect } from "@playwright/test";
import { api } from "@kriyan/backend/convex/_generated/api";
import { backendFor } from "./backend";

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
  const backend = await backendFor(page);
  await backend.mutation(api.profiles.completeOnboarding, {});
});
test("settings persists inline names, colours and reports an in-use area", async ({
  page,
}) => {
  await page.goto("/app/settings/areas");
  const backend = await backendFor(page);
  const area = await backend.mutation(api.areas.create, {
    name: "Settings fixture",
    color: "teal",
  });
  await page
    .getByRole("button", { name: "Settings fixture", exact: true })
    .click();
  const input = page.getByLabel("Area name", { exact: true });
  await input.fill("Client plans");
  await input.press("Tab");
  await expect(
    page.getByRole("button", { name: "Client plans", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Orange", exact: true }).check();
  await expect
    .poll(() => backend.query(api.areas.get, { id: area._id }))
    .toMatchObject({ name: "Client plans", color: "orange" });
  await backend.mutation(api.projects.create, {
    areaId: area._id,
    name: "Client launch",
    kind: "project",
  });
  await page.getByRole("button", { name: "Delete area", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Area is in use");
  await expect(
    page.getByRole("button", { name: "Save area", exact: true }),
  ).toHaveCount(0);
});
test("class editor normalises clock text, validates the range and persists edits", async ({
  page,
}) => {
  await page.goto("/app/settings/classes");
  await page
    .getByRole("button", { name: "Add a class or meeting", exact: true })
    .click();
  await page.getByLabel("New class or meeting").fill("Brief 12 review");
  await page.getByRole("button", { name: "Mon", exact: true }).click();
  await page.getByLabel("Start", { exact: true }).fill("1015");
  await page.getByLabel("End", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Add class", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "End time must be after the start.",
  );
  await page.getByLabel("End", { exact: true }).fill("11.15am");
  await page.getByRole("button", { name: "Add class", exact: true }).click();
  await page
    .getByRole("button", { name: "Brief 12 review", exact: true })
    .click();
  await page.getByLabel("Meeting title").fill("Weekly review");
  await page.getByLabel("Meeting title").press("Tab");
  await expect(
    page.getByRole("button", { name: "Weekly review", exact: true }),
  ).toBeVisible();
  const backend = await backendFor(page);
  await expect
    .poll(async () =>
      (await backend.query(api.events.list, {})).find(
        (e) => e.title === "Weekly review",
      ),
    )
    .toMatchObject({ startTime: "10:15", endTime: "11:15", weekdays: [1] });
  await expect(page.locator('input[type="time"]')).toHaveCount(0);
});
test("habits and planning save without a form-wide save button", async ({
  page,
}) => {
  await page.goto("/app/settings/habits");
  await page.getByRole("button", { name: "Add a habit", exact: true }).click();
  await page.getByLabel("New habit").fill("Read for pleasure");
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  await page
    .getByRole("button", { name: "Read for pleasure", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Weekly target", exact: true })
    .getByRole("button", { name: "7", exact: true })
    .click();
  await expect(page.getByText("7 of 7 a week", { exact: true })).toBeVisible();
  await page.goto("/app/settings/planning");
  await page.locator('[data-property="capacity"]').click();
  await page.getByRole("button", { name: "8h", exact: true }).click();
  await page.locator('[data-property="start"]').click();
  await page.getByLabel("Day starts", { exact: true }).fill("6");
  await page.getByLabel("Day starts", { exact: true }).press("Tab");
  await page.reload();
  await expect(page.locator('[data-property="capacity"]')).toContainText("8h");
  await expect(page.locator('[data-property="start"]')).toContainText("06:00");
  await page.locator('[data-property="timezone"]').click();
  await page.getByLabel("Search timezones").fill("New York");
  await expect(
    page
      .getByRole("group", { name: "Timezones", exact: true })
      .getByRole("button", { name: /New York/ }),
  ).toHaveCount(1);
});
test("phone settings pushes a section and provides a back link, reset is guarded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/settings");
  await page.getByRole("link", { name: "Planning", exact: true }).click();
  await expect(page).toHaveURL(/settings\/planning$/);
  await expect(
    page.getByRole("navigation", { name: "Settings sections" }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page
    .getByRole("link", { name: "Reset everything", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reset everything", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Type RESET").fill("RESET");
  await expect(
    page.getByRole("button", { name: "Reset everything", exact: true }),
  ).toBeEnabled();
});
test("grip keyboard reorder persists the complete owner-scoped order", async ({
  page,
}) => {
  await page.goto("/app/settings/areas");
  const backend = await backendFor(page);
  const areas = await backend.query(api.areas.list, {}),
    last = areas.at(-1);
  if (!last) throw new Error("Missing area fixture.");
  await page
    .getByRole("button", {
      name: `Reorder ${last.name}. Use arrow keys to move.`,
    })
    .focus();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.locator("[data-area-row]").nth(areas.length - 2),
  ).toContainText(last.name);
});
