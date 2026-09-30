import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test.describe(`09b ${width}`, () => {
    test.use({ viewport: {width, height: width === 390 ? 844 : 900}, hasTouch: width === 390, isMobile: width === 390, timezoneId: "America/New_York" });
    test("goal inline editing and phone week", async ({page}) => {
      await mkdir("../../.agents/screenshots/09b", {recursive:true});
      await page.clock.setFixedTime(new Date("2026-09-30T15:45:00Z"));
      await page.goto("/demo?view=goals");
      await page.getByRole("button", {name: "Launch Kriyan on mobile", exact:true}).click();
      const panel = page.getByRole("dialog", {name:"Goal details"});
      await expect(panel.getByText("No milestones yet.", {exact:true})).toBeVisible();
      await expect(panel.locator('input[type="date"]')).toHaveCount(0);
      await expect(panel.getByLabel("Goal title")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await panel.getByLabel("Note").fill("Make time for the Android release.");
      await panel.getByLabel("Add a milestone").fill("Review the build");
      await panel.getByLabel("Add a milestone").press("Enter");
      await panel.getByLabel("Add a milestone").fill("Publish the release");
      await panel.getByLabel("Add a milestone").press("Enter");
      await panel.getByRole("checkbox", {name:"Complete milestone: Review the build"}).click();
      await expect(panel.getByRole("heading", {name: "Milestones 1 of 2 done"})).toBeVisible();
      await panel.getByLabel("Milestone title").first().fill("Review the APK");
      await panel.getByLabel("Milestone title").first().press("Enter");
      await panel.getByRole("button", {name:"Set date: Review the APK"}).click();
      await expect(panel.locator('input[type="date"]')).toHaveCount(0);
      await panel.getByRole("button", {name:"Pick a day", exact:true}).click();
      await panel.getByLabel("Milestone date").fill("2026-10-09");
      await expect(panel.getByRole("button", {name:"Set date: Review the APK"})).toHaveText("Fri 9 Oct");
      await page.keyboard.press("Escape");
      await expect(panel).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({path:`../../.agents/screenshots/09b/goal-panel-${width}.png`,animations:"disabled"});
      await panel.getByRole("button", {name:"Close goal details"}).click();
      await page.getByRole("button", {name:"Launch Kriyan on mobile", exact:true}).click();
      await expect(panel.getByLabel("Note")).toHaveValue("Make time for the Android release.");
      await panel.getByLabel("Milestone title").first().focus();
      await panel.getByRole("button", {name:"Remove milestone: Review the APK"}).click();
      await expect(panel.getByRole("heading", {name:"Milestones 0 of 1 done"})).toBeVisible();
      await panel.getByRole("button", {name:"Close goal details"}).click();
      if (width === 390) {
        await page.getByRole("button", {name:"Week", exact:true}).click();
        const title = await page.getByRole("heading", {name:"Week", exact:true}).boundingBox();
        const nav = await page.getByRole("button", {name:"Today", exact:true}).boundingBox();
        expect(Math.abs((title?.y ?? 0) - (nav?.y ?? 0))).toBeLessThan(20);
        await expect(page.locator('header').filter({has:page.getByRole('heading',{name:'Week',exact:true})})).toContainText("28 September to 4 October.");
        await page.screenshot({path:"../../.agents/screenshots/09b/week-390.png",animations:"disabled"});
      }
    });
  });
}
