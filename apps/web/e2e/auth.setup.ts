import { mkdir, writeFile } from "node:fs/promises";
import { createTestUser } from "../../../.agents/skills/test-kriyan/scripts/lib/users.mjs";
import { prepareClerk, signInPage } from "../../../.agents/skills/test-kriyan/scripts/lib/browser.mjs";
import { test as setup, expect } from "@playwright/test";
setup("authenticate a dedicated Clerk test user", async ({ page }, testInfo) => {
  setup.setTimeout(120_000);
  await prepareClerk();
  const prefix = testInfo.project.name === "settings-setup" ? "settings-" : testInfo.project.name === "states-setup" ? "states-" : "";
  let email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) {
    const user = await createTestUser({ tag: `e2e-${prefix}`.replace(/-$/, "") });
    email = user.email;
    await mkdir("e2e/.auth", { recursive: true });
    await writeFile(
      `e2e/.auth/${prefix}disposable-user.json`,
      JSON.stringify({ id: user.id }),
    );
  }
  await signInPage(page, email, { base: String(testInfo.project.use.baseURL) });
  await expect(
    page
      .getByRole("heading", { name: "What do you plan for?", exact: true })
      .first(),
  ).toBeVisible();
  await mkdir("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: `e2e/.auth/${prefix}user.json` });
});
