import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // The three bun:test suites are collected separately by test:bun.
    // AccountSettings selects happy-dom with its per-file environment pragma.
    include: ["src/lib/operations/**/*.test.ts", "src/lib/hardening.test.ts", "src/components/app/AccountSettings.test.tsx"],
  },
});
