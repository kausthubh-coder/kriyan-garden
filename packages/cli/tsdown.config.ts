import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { kriyan: "src/kriyan.ts" },
  format: "esm",
  platform: "node",
  target: "node22",
  dts: false,
  clean: true,
  deps: { alwaysBundle: ["@kriyan/core"], neverBundle: ["@napi-rs/keyring"] },
  outExtensions: () => ({ js: ".js" }),
  outputOptions: { codeSplitting: false },
});
