import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3004";
const output = path.resolve("../../.agents/screenshots/04/lighthouse");
await mkdir(output, { recursive: true });
const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless", "--no-first-run", "--disable-dev-shm-usage"] });
const rows = [];
try {
  for (const route of ["/", "/docs"]) for (const formFactor of ["desktop", "mobile"]) {
    const result = await lighthouse(`${base}${route}`, {
      port: chrome.port, output: "html", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor,
      ...(formFactor === "desktop" ? { screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } } : {}),
    });
    if (!result) throw new Error("Lighthouse returned no result.");
    const name = `${route === "/" ? "landing" : "docs"}-${formFactor}`;
    await writeFile(path.join(output, `${name}.html`), result.report);
    await writeFile(path.join(output, `${name}.json`), JSON.stringify(result.lhr, null, 2));
    const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)]));
    const failed = Object.values(result.lhr.audits).filter((audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "informative").map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, details: audit.details }));
    const row = { route, formFactor, lighthouseVersion: result.lhr.lighthouseVersion, scores, warnings: result.lhr.runWarnings, metrics: { fcp: result.lhr.audits["first-contentful-paint"].numericValue, lcp: result.lhr.audits["largest-contentful-paint"].numericValue, tbt: result.lhr.audits["total-blocking-time"].numericValue, cls: result.lhr.audits["cumulative-layout-shift"].numericValue }, failed };
    rows.push(row); console.log(JSON.stringify({ route, formFactor, scores, warnings: row.warnings }));
  }
  await writeFile(path.join(output, "summary.json"), JSON.stringify(rows, null, 2));
  const gates = rows.every((row) => row.scores.accessibility >= 95 && (row.formFactor !== "desktop" || Object.values(row.scores).every((score) => score >= 90)));
  console.log(`Required Lighthouse thresholds: ${gates ? "PASS" : "FAIL"}`);
  if (!gates) process.exitCode = 1;
} finally { await chrome.kill(); }
