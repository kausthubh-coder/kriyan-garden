import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";
loadEnvConfig(process.cwd());
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve("../../.agents/playwright-browsers");
export default defineConfig({ testDir: "./e2e", testMatch: "functional-qa.spec.ts", workers: 1,
  timeout: 120_000, expect: { timeout: 15_000 }, reporter: [["list"]],
  use: { baseURL: "http://localhost:3500", trace: "retain-on-failure" } });
