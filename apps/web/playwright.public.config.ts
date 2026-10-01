import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/public", workers: 1, retries: 0, timeout: 30_000, reporter: "list",
  use: { channel: "chrome", baseURL: process.env.PUBLIC_BASE_URL ?? "http://localhost:3004", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
});
