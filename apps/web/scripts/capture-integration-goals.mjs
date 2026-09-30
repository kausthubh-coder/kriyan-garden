import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const source = `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3008"}/demo?view=goals`;
const directory = path.resolve("../../.agents/screenshots/04-integration");
const original = path.join(directory, "demo-goals-1440.png");
const assets = path.resolve("public/landing");
const preserved = ["day", "deadlines", "list", "week", "mobile-web"];
const digest = async (name) => createHash("sha256").update(await readFile(path.join(assets, `${name}.webp`))).digest("hex");
const before = Object.fromEntries(await Promise.all(preserved.map(async (name) => [name, await digest(name)])));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const errors = [], consoleErrors = [], external = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", timezoneId: "America/New_York" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", (request) => { const host = new URL(request.url()).hostname; if (/clerk|convex/i.test(host)) external.push(host); });
  page.on("websocket", (socket) => { const host = new URL(socket.url()).hostname; if (/clerk|convex/i.test(host)) external.push(host); });
  await page.goto(source);
  await page.getByRole("button", { name: "Open goal details: Run a 10k", exact: true }).waitFor();
  await page.getByRole("progressbar", { name: "Launch Kriyan on mobile progress" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: original });
  if (errors.length || consoleErrors.length || external.length) throw new Error("The Goals capture had page, console or backend traffic errors.");
  await sharp(original).extract({ left: 100, top: 80, width: 1180, height: 740 }).webp({ quality: 85 }).toFile(path.join(assets, "goals.webp"));
  const after = Object.fromEntries(await Promise.all(preserved.map(async (name) => [name, await digest(name)])));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Another landing asset changed during capture.");
  await writeFile(path.join(directory, "capture-results.json"), JSON.stringify({ source, viewport: { width: 1440, height: 900 }, original, asset: "apps/web/public/landing/goals.webp", crop: { left: 100, top: 80, width: 1180, height: 740 }, errors, consoleErrors, external, preservedAssets: after }, null, 2));
  console.log("Captured integrated /demo?view=goals at 1440x900. Updated goals.webp only. No page or console errors, no Clerk/Convex traffic; other landing asset hashes unchanged.");
} finally { await browser.close(); }
