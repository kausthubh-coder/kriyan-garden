import { readFile, unlink } from "node:fs/promises";
import { createClerkClient } from "@clerk/backend";
import { test, expect } from "@playwright/test";
import { api } from "@kriyan/backend/convex/_generated/api";
import { backendFor } from "./backend";
test("reset the disposable planner and remove its test user", async ({ page }, testInfo) => {
  if (process.env.E2E_CLERK_USER_EMAIL) return;
  const prefix = testInfo.project.name === "settings-cleanup" ? "settings-" : testInfo.project.name === "states-cleanup" ? "states-" : "";
  const record: unknown = JSON.parse(
    await readFile(`e2e/.auth/${prefix}disposable-user.json`, "utf8"),
  );
  if (
    !record ||
    typeof record !== "object" ||
    !("id" in record) ||
    typeof record.id !== "string"
  )
    throw new Error("Disposable test user record is invalid.");
  await page.goto("/app/settings/reset");
  const backend = await backendFor(page);
  // A failed onboarding test still needs its disposable user cleaned up.
  if (!(await backend.query(api.profiles.get, {}))?.onboardingComplete) {
    await backend.mutation(api.profiles.completeOnboarding, {});
    await page.goto("/app/settings/reset");
  }
  const reset = page.getByRole("button", {
    name: "Reset everything",
    exact: true,
  });
  await expect(reset).toBeDisabled();
  await page.getByLabel("Type RESET").fill("reset");
  await expect(reset).toBeDisabled();
  await page.getByLabel("Type RESET").fill("RESET");
  await reset.click();
  await expect(page).toHaveURL(/\/app\/welcome$/);
  await expect(
    page.getByRole("button", { name: "School", exact: true }),
  ).toBeVisible();
  // Close the app before the final reset so it cannot recreate a profile.
  await page.close();
  await backend.mutation(api.profiles.resetAll, {});
  await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.deleteUser(record.id);
  await unlink(`e2e/.auth/${prefix}disposable-user.json`);
  await unlink(`e2e/.auth/${prefix}user.json`);
});
