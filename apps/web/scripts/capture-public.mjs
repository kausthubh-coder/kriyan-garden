import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3004";
const captures = path.resolve("../../.agents/screenshots/04");
const assets = path.resolve("public/landing");
await mkdir(captures, { recursive: true }); await mkdir(assets, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", timezoneId: "America/New_York" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  for (const view of ["day", "goals", "list", "week"]) {
    await page.goto(`${base}/demo?view=${view}`);
    await page.getByRole("button", { name: "Add task", exact: true }).first().waitFor();
    await page.waitForFunction(() => document.querySelector("[data-day-scroll]") || document.querySelector("main h1"));
    await page.evaluate(() => document.fonts.ready);
    if (view === "day") await page.locator("[data-day-scroll]").evaluate((el) => { el.scrollTop = 80; });
    await page.screenshot({ path: path.join(captures, `demo-${view}-1440.png`) });
    const region = view === "day" ? { left: 72, top: 80, width: 1260, height: 760 } : { left: 120, top: 110, width: 1180, height: 740 };
    await sharp(path.join(captures, `demo-${view}-1440.png`)).extract(region).webp({ quality: 85 }).toFile(path.join(assets, `${view}.webp`));
    if (view === "day") {
      const rail = page.getByRole("complementary", { name: "Week load, deadlines and goals" });
      const box = await rail.boundingBox();
      if (!box) throw new Error("Deadlines rail was not visible at 1440px.");
      await sharp(path.join(captures, `demo-${view}-1440.png`)).extract({ left: Math.round(box.x), top: Math.round(box.y + 190), width: Math.round(box.width), height: 460 }).resize(440, 460).webp({ quality: 85 }).toFile(path.join(assets, "deadlines.webp"));
    }
  }
  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce", timezoneId: "America/New_York" });
  const phone = await mobile.newPage();
  phone.on("pageerror", (error) => errors.push(error.message));
  await phone.goto(`${base}/demo`); await phone.getByRole("button", { name: "Add task", exact: true }).first().waitFor(); await phone.evaluate(() => document.fonts.ready);
  await phone.screenshot({ path: path.join(captures, "demo-mobile-web-390.png") });
  await sharp(path.join(captures, "demo-mobile-web-390.png")).webp({ quality: 85 }).toFile(path.join(assets, "mobile-web.webp"));
  await mobile.close();
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    p.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["/", "/docs"]) {
      await p.goto(`${base}${route}`); await p.evaluate(() => document.fonts.ready);
      if (route === "/") { await p.frameLocator("iframe").getByRole("button", { name: "Add task", exact: true }).first().waitFor(); for (const img of await p.locator("img").all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate((el) => el.decode()); } await p.evaluate(() => window.scrollTo(0, 0)); }
      await p.screenshot({ path: path.join(captures, `${route === "/" ? "landing" : "docs"}-${width}.png`), fullPage: true });
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Horizontal overflow on ${route} at ${width}px`);
    }
    await ctx.close();
  }
  await writeFile(path.join(captures, "capture-results.json"), JSON.stringify({ source: base, viewport: "1440x900 and 390x844", captures: "Real shared web components with public in-memory sample data", errors }, null, 2));
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Captured real Day, Goals, List, Week, deadlines and mobile web; landing/docs at 1440 and 390. No overflow or page errors.");
} finally { await browser.close(); }
