import { mkdir, writeFile } from "node:fs/promises";
import { createClerkClient } from "@clerk/backend";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
setup("authenticate a dedicated Clerk test user", async ({ page }, testInfo) => {
  setup.setTimeout(120_000);
  const secret = process.env.CLERK_SECRET_KEY,
    publishable =
      process.env.CLERK_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secret?.startsWith("sk_test_") || !publishable?.startsWith("pk_test_"))
    throw new Error(
      "E2E requires development CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Set them in apps/web/.env.local.",
    );
  process.env.CLERK_PUBLISHABLE_KEY = publishable;
  await clerkSetup();
  const client = createClerkClient({ secretKey: secret });
  const prefix = testInfo.project.name === "settings-setup" ? "settings-" : "";
  let email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) {
    email = `kriyan-e2e-${Date.now()}+clerk_test@example.com`;
    const user = await client.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    });
    await mkdir("e2e/.auth", { recursive: true });
    await writeFile(
      `e2e/.auth/${prefix}disposable-user.json`,
      JSON.stringify({ id: user.id }),
    );
  }
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/app");
  await expect(
    page
      .getByRole("heading", { name: "What do you plan for?", exact: true })
      .first(),
  ).toBeVisible();
  await mkdir("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: `e2e/.auth/${prefix}user.json` });
});
