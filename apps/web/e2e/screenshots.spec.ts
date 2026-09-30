import { mkdir } from "node:fs/promises";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";
import { api } from "@kriyan/backend/convex/_generated/api";
import { addDays } from "@kriyan/core";
import { backendFor } from "./backend";
const directory = "../../.agents/screenshots/03";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`capture six planner screens at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const email = process.env.E2E_SCREENSHOT_USER_EMAIL;
    if (email) {
      await setupClerkTestingToken({ page });
      await page.goto("/sign-in");
      await clerk.signIn({ page, emailAddress: email });
    }
    await page.goto("/app");
    await expect(
      page
        .locator('[data-loading="false"]')
        .or(page.getByRole("heading", { name: "Areas", exact: true }))
        .first(),
    ).toBeVisible();
    // Existing dedicated prototype fixture users may predate onboarding.
    if (
      await page.getByRole("button", { name: "Continue" }).isVisible()
    ) {
      await page.getByRole("button", { name: "Continue" }).click();
      for (let i = 0; i < 3; i++)
        await page.getByRole("button", { name: "Skip" }).click();
      await page.getByRole("button", { name: "Open my planner" }).click();
    }
    await expect(page.locator('[aria-busy="false"]').first()).toBeVisible();
    const backend = email ? await backendFor(page) : null;
    const originalGoals = backend
      ? await backend.query(api.goals.list, {})
      : [];
    // Older prototype fixture users have no dates. Supply dates for the captures,
    // then restore every original field. This uses existing deployed operations.
    for (const goal of originalGoals) {
      if (!backend || goal.targetDate) continue;
      const [elapsed, remaining] = goal.title.includes("GPA")
        ? [120, 80]
        : goal.title.includes("10k")
          ? [75, 54]
          : [71, 77];
      const today = await page.evaluate(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });
      await backend.mutation(api.goals.update, {
        id: goal._id,
        patch: {
          startDate: addDays(today, -elapsed),
          targetDate: addDays(today, remaining),
        },
      });
    }
    await mkdir(directory, { recursive: true });
    const capture = async (name: string) => {
      await expect(page.locator('[aria-busy="false"]').first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.screenshot({
        path: `${directory}/${name}-${width}.png`,
        animations: "disabled",
      });
    };
    try {
      for (const view of ["day", "list", "week", "goals"]) {
        await page.goto(`/app?view=${view}`);
        await capture(view);
      }
      await page.goto("/app/settings");
      await mkdir("../../.agents/screenshots/03c", { recursive: true });
      const index = page.getByRole("navigation", { name: "Settings sections" });
      await expect(index).toBeVisible();
      for (const name of [
        "Areas",
        "Projects and courses",
        "Classes and meetings",
        "Habits",
        "Planning",
        "Account",
        "Reset everything",
      ]) {
        await page.goto(`/app/settings/${({ Areas: "areas", "Projects and courses": "projects", "Classes and meetings": "classes", Habits: "habits", Planning: "planning", Account: "account", "Reset everything": "reset" } as Record<string, string>)[name]}`);
        await expect(
          page.getByRole("heading", { name, exact: true }),
        ).toBeVisible();
        if (name === "Account") {
          await expect(page.locator(".cl-userProfile-root")).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Update profile", exact: true }),
          ).toBeInViewport();
        }
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
          path: `../../.agents/screenshots/03c/settings-${name.toLowerCase().replaceAll(" ", "-")}-${width}.png`,
          animations: "disabled",
        });
        if (name === "Areas")
          await page.screenshot({
            path: `../../.agents/screenshots/03c/settings-${width}.png`,
            animations: "disabled",
          });
      }
      await page.goto("/app");
      await page
        .getByRole("button", { name: "Add task", exact: true })
        .first()
        .click();
      const add = page.getByRole("dialog", { name: "Add a task" });
      await add.getByRole("textbox").fill("econ outline fri 5pm #econ 45m");
      await capture("quick-add");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+k");
      const palette = page.getByRole("dialog", { name: "Search and commands" });
      await palette
        .getByRole("combobox", { name: "Search" })
        .fill(email ? "Send the September invoice" : "gym");
      await expect(
        palette.getByRole("button", {
          name: email ? /^Send the September invoice/ : /^Gym/,
        }),
      ).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("dialog", { name: "Task details" }),
      ).toBeVisible();
      await capture("task-panel");
    } finally {
      if (backend)
        for (const goal of originalGoals)
          await backend.mutation(api.goals.update, {
            id: goal._id,
            patch: { startDate: goal.startDate, targetDate: goal.targetDate },
          });
    }
  });
}
