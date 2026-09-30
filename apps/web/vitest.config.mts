import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // The three bun:test suites are collected separately by test:bun.
    // DOM suites select happy-dom with their per-file environment pragmas.
    include: ["src/lib/operations/**/*.test.ts", "src/lib/hardening.test.ts", "src/components/app/AccountSettings.test.tsx", "src/components/app/TaskSelection.test.tsx", "src/components/app/Onboarding.test.tsx"],
  },
});
