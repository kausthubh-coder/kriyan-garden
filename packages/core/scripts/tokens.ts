import {
  colors,
  spacing,
  radii,
  typeSizes,
  motion,
  layout,
  controls,
} from "../src/tokens";
import { nativeColor, nativeThemeSource } from "./nativeTokens";

const declarations = [
  "color-scheme: dark;",
  ...Object.entries(colors).map(([name, value]) => `--${name}: ${value};`),
  ...spacing.map((value) => `--space-${value}: ${value}px;`),
  ...radii.map((value) => `--radius-${value}: ${value}px;`),
  ...typeSizes.map(
    (value) => `--text-${String(value).replace(".", "-")}: ${value}px;`,
  ),
  `--hh: ${layout.hourHeight}px;`,
  `--timeline-hour-height: ${layout.hourHeight}px;`,
  `--phone-hh: ${layout.phoneHourHeight}px;`,
  `--ctl: ${controls.compact}px;`,
  `--ctl-lg: ${controls.primary}px;`,
  "--control-height: var(--ctl);",
  `--press: ${motion.press}ms;`,
  `--transition: ${motion.transition}ms;`,
  `--panel-duration: ${motion.panel}ms;`,
  `--out: ${motion.easeOut};`,
  // Existing public styles use these aliases.
  "--space-small: var(--space-8);",
  "--space-medium: var(--space-16);",
  "--space-large: var(--space-24);",
  "--radius-control: var(--radius-8);",
  "--text-body: var(--text-15);",
  "--text-title: var(--text-24);",
];
const css = `/* Generated from packages/core/src/tokens.ts. Do not edit. */\n:root {\n  ${declarations.join("\n  ")}\n}\n@media (pointer: coarse) {\n  :root { --ctl: ${controls.touch}px; --ctl-lg: ${controls.touch}px; }\n}\n`;
for (const path of [
  "../src/tokens.css",
  "../../../apps/web/src/app/tokens.css",
]) {
  await Bun.write(new URL(path, import.meta.url), css);
}
console.log("Generated core and web tokens.css from tokens.ts");
await Bun.write(new URL("../../../apps/mobile/src/theme.ts", import.meta.url), nativeThemeSource());
console.log("Generated mobile theme.ts from tokens.ts");
// Native startup renders before React and therefore needs the same token in
// Expo's generated Android window and splash configuration.
const configPath = new URL("../../../apps/mobile/app.json", import.meta.url);
type Plugin = string | [string, Record<string, unknown>];
const config = await Bun.file(configPath).json() as {
  expo: { backgroundColor?: string; android: { backgroundColor?: string }; plugins: Plugin[] };
};
const backgroundColor = nativeColor(colors.bg);
config.expo.backgroundColor = backgroundColor;
config.expo.android.backgroundColor = backgroundColor;
config.expo.plugins = config.expo.plugins.map<Plugin>(plugin =>
  (typeof plugin === "string" ? plugin : plugin[0]) === "expo-splash-screen"
    ? ["expo-splash-screen", { ...(typeof plugin === "string" ? {} : plugin[1]), backgroundColor, image: "./assets/icons/foreground.png" }]
    : plugin,
);
await Bun.write(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("Generated native startup background from tokens.ts");
