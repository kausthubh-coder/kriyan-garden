import { expect, test } from "bun:test";
import { snapTime, snapLength } from "./helpers";
import { theme } from "./theme";
import appConfig from "../app.json";
import {
  nativeColor,
  nativeThemeSource,
} from "../../../packages/core/scripts/nativeTokens";
test("native window and splash share the app's Android-compatible background", () => {
  expect(theme.colors.bg).toMatch(/^#[0-9a-f]{6}$/i);
  expect(appConfig.expo.backgroundColor).toBe(theme.colors.bg);
  expect(appConfig.expo.android.backgroundColor).toBe(theme.colors.bg);
  const splash = appConfig.expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");
  expect(splash).toEqual(["expo-splash-screen", { backgroundColor: theme.colors.bg, image: "./assets/icons/foreground.png" }]);
});
test("native theme is generated from the source tokens", async () => {
  expect(await Bun.file(new URL("./theme.ts", import.meta.url)).text()).toBe(
    nativeThemeSource(),
  );
  expect(nativeColor("oklch(0% 0 0)")).toBe("#000000");
  expect(nativeColor("oklch(100% 0 0)")).toBe("#ffffff");
  expect(theme.layout.controlHeight).toBeGreaterThanOrEqual(44);
});
test("drag snaps, clamps both ends and preserves optional length", () => {
  expect(snapTime(22, 7, 23)).toBe("07:30");
  expect(snapTime(-999, 7, 23)).toBe("07:00");
  expect(snapTime(99999, 7, 23, 60)).toBe("22:00");
  expect(snapTime(99999, 7, 23, null)).toBe("22:45");
  expect(snapLength(0)).toBe(15);
  expect(snapLength(56)).toBe(60);
});
