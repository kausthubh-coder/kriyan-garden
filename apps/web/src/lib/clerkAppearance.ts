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
    badge: {
      color: "var(--ink-2)", background: "var(--s2)", opacity: 1,
    },
    rootBox: {
      "& button, & a, & input": {
        minHeight: "var(--control-height)", minWidth: "var(--control-height)",
      },
      "& a": { display: "inline-flex", alignItems: "center" },
      "& button:hover, & a:hover": { opacity: .9 },
      "& button:active, & a:active": { opacity: .8 },
      "& button:focus-visible, & a:focus-visible, & input:focus-visible": {
        outline: "2px solid var(--ink)", outlineOffset: "2px",
      },
      "& button:disabled, & input:disabled": { opacity: .6, cursor: "default" },
      // Clerk runtime components should not animate keyboard actions or ignore
      // reduced motion. These controls need no motion to communicate state.
      "& *, & *::before, & *::after": { animation: "none", transition: "none" },
    },
  },
};
