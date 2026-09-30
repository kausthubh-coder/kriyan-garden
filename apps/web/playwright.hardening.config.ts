import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(process.cwd(), "../../.agents/playwright-browsers");
export default defineConfig({
  testDir: "./e2e",
  testMatch: "hardening.spec.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3007", trace: "off" },
});
