import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@kriyan/backend/convex/_generated/api";
import { createTestUser, deleteTestUser, clerkClient } from "../../../.agents/skills/test-kriyan/scripts/lib/users.mjs";
import { signInPage, prepareClerk } from "../../../.agents/skills/test-kriyan/scripts/lib/browser.mjs";

test("Reviewer nits: empty phone week, desktop today, list gap and email-code sign-in", async ({ page }) => {
  test.setTimeout(180_000);
  const user = await createTestUser({ tag: "qa21-nits" });
  await prepareClerk();
  const sdk = clerkClient();
  const session = await sdk.sessions.createSession({ userId: user.id });
  const backend = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "", { logger:false });
  backend.setAuth((await sdk.sessions.getToken(session.id, "convex")).jwt);
  try {
    await backend.mutation(api.profiles.ensure, {timezone:"America/New_York"});
    await backend.mutation(api.profiles.completeOnboarding, {});
    await signInPage(page, user.email, {base: test.info().project.use.baseURL ?? "http://localhost:3500"});
    await page.setViewportSize({width:390,height:844});
    await page.goto("/app?view=week");
    const days = page.locator('section').filter({has:page.getByRole('button',{name:/^Open (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/})});
    await expect(days).toHaveCount(7);
    for (const day of await days.all()) expect((await day.boundingBox())?.height).toBe(56);
    await page.setViewportSize({width:699,height:844});
    for (const day of await days.all()) expect((await day.boundingBox())?.height).toBe(56);
    await page.setViewportSize({width:700,height:844});
    await expect(days.first()).toHaveCSS('min-height','120px');
    await expect(days.first()).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await page.setViewportSize({width:1440,height:900});
    await expect(days.first()).toHaveCSS('min-height','120px');
    const today = days.filter({has:page.getByRole('button',{name:new RegExp(`^Open ${new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'America/New_York'}).format(new Date())},`)})});
    await expect(today).toHaveCSS('border-top-width','1px');
    await expect(today).toHaveCSS('box-shadow','none');
    await page.goto('/app?view=list');
    const empty = page.getByText('Nothing planned for today.',{exact:true});
    await expect(empty).toHaveCSS('margin-top','20px');
    await page.evaluate(async () => {
      const clerk = (window as unknown as { Clerk: { signOut: () => Promise<void> } }).Clerk;
      await clerk.signOut();
    });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading',{name:'Sign in to Kriyan',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Use email code',exact:true}).click();
    const form = page.getByRole('region',{name:'Sign in with an email code'});
    await form.getByLabel('Email',{exact:true}).fill(user.email);
    await form.getByRole('button',{name:'Send code',exact:true}).click();
    await form.getByLabel('Verification code',{exact:true}).fill('424242');
    await form.getByRole('button',{name:'Verify code',exact:true}).click();
    await expect(page).toHaveURL(/\/app$/);
  } finally {await page.close(); await deleteTestUser(user.id);}
});
