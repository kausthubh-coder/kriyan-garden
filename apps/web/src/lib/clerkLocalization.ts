import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

export const clerkLocalization: ComponentProps<typeof ClerkProvider>["localization"] = {
  signIn: { start: { title: "Sign in to Kriyan", titleCombined: "Sign in to Kriyan", subtitle: "Pick up where you left off.", subtitleCombined: "Plan your day with your AI." } },
  signUp: { start: { title: "Create your Kriyan account", subtitle: "Make room for what matters to you." } },
};
