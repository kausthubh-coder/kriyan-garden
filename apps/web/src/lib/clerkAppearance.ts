import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";
export const clerkAppearance: ComponentProps<
  typeof ClerkProvider
>["appearance"] = {
  variables: {
    colorPrimary: "var(--ink)",
    colorPrimaryForeground: "var(--on)",
    colorBackground: "var(--s1)",
    colorForeground: "var(--ink)",
    colorMuted: "var(--s2)",
    colorMutedForeground: "var(--ink-3)",
    colorInput: "var(--s2)",
    colorInputForeground: "var(--ink)",
    colorDanger: "var(--hot)",
    colorBorder: "var(--line)",
    colorRing: "var(--ink)",
    fontFamily: "var(--font-schibsted), sans-serif",
    borderRadius: "var(--radius-10)",
  },
  elements: {
    cardBox: { boxShadow: "none", maxWidth: "100%" },
    card: { background: "var(--s1)", border: "1px solid var(--line)" },
    formButtonPrimary: {
      minHeight: "var(--control-height)",
      textTransform: "none",
    },
    formFieldInput: { minHeight: "var(--control-height)" },
    socialButtonsBlockButton: { minHeight: "var(--control-height)" },
    footer: { background: "var(--s1)", backgroundImage: "none" },
    userProfileRoot: { width: "100%", maxWidth: "100%" },
  },
};
