import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kriyan",
  slug: "kriyan",
  android: { ...config.android, ...(process.env.ANDROID_GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.ANDROID_GOOGLE_SERVICES_FILE } : {}) },
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
