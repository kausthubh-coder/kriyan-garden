import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(
  process.cwd(),
  "../../.agents/playwright-browsers",
);
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    channel: "chrome",
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "states-setup", testMatch: /auth\.setup\.ts/, teardown: "states-cleanup" },
    { name: "states", testMatch: /states\.spec\.ts/, dependencies: ["states-setup"],
      use: { ...devices["Desktop Chrome"], timezoneId: "America/New_York", storageState: "e2e/.auth/states-user.json" } },
    { name: "states-cleanup", testMatch: /auth\.teardown\.ts/, use: { storageState: "e2e/.auth/states-user.json" } },
    {
      name: "onboarding-settings",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/settings-user.json",
      },
      dependencies: ["settings-setup"],
      testMatch: /onboarding-settings\.spec\.ts/,
    },
    { name: "settings-setup", testMatch: /auth\.setup\.ts/, teardown: "settings-cleanup" },
    { name: "settings-cleanup", testMatch: /auth\.teardown\.ts/, use: { storageState: "e2e/.auth/settings-user.json" } },
    {
      name: "polish",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(?:polish|leftovers|landing)\.spec\.ts/,
    },
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "cleanup" },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: /planner\.spec\.ts/,
    },
    {
      name: "configuration",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["chromium"],
      testMatch: /configuration\.spec\.ts/,
    },
    {
      name: "screenshots",
      use: {
        ...devices["Desktop Chrome"],
        storageState: process.env.E2E_SCREENSHOT_USER_EMAIL
          ? undefined
          : "e2e/.auth/user.json",
      },
      dependencies: ["configuration"],
      testMatch: /screenshots\.spec\.ts/,
    },
    {
      name: "cleanup",
      testMatch: /auth\.teardown\.ts/,
      use: { storageState: "e2e/.auth/user.json" },
    },
  ],
  webServer: new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").protocol === "http:" ? {
    command: `bun run dev --port ${new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").port || "3000"}`,
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  } : undefined,
});
