import { mkdir, readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

for (const width of [1440,390]) {
  test.describe(`landing ${width}`, () => {
    test.use({viewport:{width,height:width === 390 ? 844 : 900},hasTouch:width === 390,isMobile:width === 390,timezoneId:"America/New_York"});
    test("reference layout, live parser, snippets and deferred demo", async ({page, context, request}) => {
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const html = await (await request.get("/")).text();
      expect(html).toContain("CS 201 lecture");
      expect(html).toContain("Calculus II midterm");
      expect(html).not.toMatch(/src="\/landing\/(day|goals|list|week|deadlines|mobile-web)\.webp/);
      await page.clock.setFixedTime(new Date("2026-09-30T15:45:00Z"));
      await page.goto("/");
      const nav = page.getByRole("navigation",{name:"Website"});
      await expect(nav.getByRole("link",{name:"Docs",exact:true})).toBeVisible();
      if (width === 390) {
        await expect(nav.getByRole("link",{name:"GitHub",exact:true})).toBeHidden();
        await expect(nav.getByRole("link",{name:"Android",exact:true})).toBeHidden();
        const boxes = await Promise.all(["kriyan","Docs","Open Kriyan"].map(name => nav.getByRole("link",{name,exact:true}).boundingBox()));
        expect(Math.max(...boxes.map(box => box?.y ?? 0))-Math.min(...boxes.map(box => box?.y ?? 0))).toBeLessThan(20);
      }
      await expect(page.locator('[aria-hidden="true"] button')).toHaveCount(0);
      const input = page.getByLabel("Type it the way you would say it.");
      const tags = page.getByRole("status").first();
      await expect(input).toHaveValue(""); await expect(tags).toBeEmpty();
      await page.getByRole("button",{name:"essay fri 5pm #econ 2h",exact:true}).click();
      await expect(tags).toContainText("SchoolEcon 101");
      await expect(tags).toContainText("Fri 2 Oct"); await expect(tags).toContainText("17:00"); await expect(tags).toContainText("2h");
      await input.fill(""); await expect(tags).toBeEmpty();
      const mcp = await readFile("../../docs/site/mcp.md","utf8");
      for (const name of ["Claude","Claude Code","ChatGPT","Cursor","VS Code"]) {
        await page.getByRole("tab",{name,exact:true}).click();
        const snippet = await page.getByRole("tabpanel").locator("code").innerText();
        expect(mcp.replaceAll("\r\n", "\n")).toContain(snippet);
        await page.getByRole("button",{name:"Copy",exact:true}).click();
        await expect(page.getByRole("button",{name:"Copied",exact:true})).toBeVisible();
        expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n")).toBe(snippet);
      }
      await expect(page.getByRole("button",{name:"Copy",exact:true})).toBeVisible({timeout:3000});
      const hero = page.locator('iframe[title="Interactive Kriyan demo with sample tasks"]');
      await hero.scrollIntoViewIfNeeded();
      const frame = page.frameLocator('iframe[title="Interactive Kriyan demo with sample tasks"]');
      await expect(frame.getByRole("heading",{name:"Wednesday",exact:true})).toBeVisible();
      if (width === 1440) {
        await expect(frame.getByRole("complementary",{name:"Week load, deadlines and goals"})).toBeVisible();
        const filters = await frame.locator('[class*="filters"]').first().locator("button").all();
        const positions = await Promise.all(filters.map(button => button.boundingBox()));
        expect(new Set(positions.map(box => box?.y)).size).toBe(1);
      }
      const geometry = await hero.boundingBox(); expect(geometry?.height).toBe(width === 390 ? 560 : 640);
      if (width === 1440) expect(geometry?.width).toBe(1180);
      await page.locator('[class*="phoneEmbed"]').scrollIntoViewIfNeeded();
      await expect(page.frameLocator('iframe[title="Kriyan phone demo with sample tasks"]').getByRole("heading",{name:"Wednesday",exact:true})).toBeVisible();
      await page.evaluate(() => { window.scrollTo(0,0); return document.fonts.ready; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await mkdir("../../.agents/screenshots/10",{recursive:true});
      await page.screenshot({path:`../../.agents/screenshots/10/landing-${width}.png`,fullPage:true,animations:"disabled"});
      expect(errors).toEqual([]);
    });
  });
}

test("demo navigation begins after the hero's first paint", async ({page}) => {
  await page.goto("/");
  await expect(page.frameLocator('iframe[title="Interactive Kriyan demo with sample tasks"]').getByRole("button",{name:"Add task",exact:true}).first()).toBeVisible();
  const timing = await page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Interactive Kriyan demo with sample tasks"]');
    const paint = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
    return {paint: paint === undefined ? undefined : performance.timeOrigin + paint, demo:frame?.contentWindow?.performance.timeOrigin};
  });
  expect(timing.paint).toBeGreaterThan(0);
  expect(timing.demo).toBeGreaterThan(timing.paint ?? 0);
});
