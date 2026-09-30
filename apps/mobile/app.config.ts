import type { ConfigContext, ExpoConfig } from "expo/config";
import { readFileSync } from "node:fs";
// Expo evaluates this file without registering a loader for imported TS files.
const tokenSource = readFileSync(`${__dirname}/src/theme.ts`, "utf8");
const background = /"bg":\s*"([^"]+)"/.exec(tokenSource)?.[1];
if (!background)
  throw new Error("Generated mobile theme is missing its background colour.");
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kriyan",
  slug: "kriyan",
  icon: "./assets/icons/icon.png",
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/icons/foreground.png",
      monochromeImage: "./assets/icons/monochrome.png",
      backgroundColor: background,
    },
    ...(process.env.ANDROID_GOOGLE_SERVICES_FILE
      ? { googleServicesFile: process.env.ANDROID_GOOGLE_SERVICES_FILE }
      : {}),
  },
  plugins: config.plugins?.map((plugin) =>
    plugin === "expo-quick-actions"
      ? [
          "expo-quick-actions",
          {
            androidIcons: {
              shortcut_add: {
                foregroundImage: "./assets/icons/shortcut-add.png",
                backgroundColor: background,
              },
            },
          },
        ]
      : plugin,
  ),
  extra: {
    ...config.extra,
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
});
