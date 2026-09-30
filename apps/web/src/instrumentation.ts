import type { Instrumentation } from "next";
import { sentryOptions } from "./lib/sentry-options";

export async function register() {
  const options = sentryOptions(process.env.SENTRY_DSN);
  if (!options.enabled) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(options);
}

export const onRequestError: Instrumentation.onRequestError = async (error) => {
  if (!sentryOptions(process.env.SENTRY_DSN).enabled) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error);
  await Sentry.flush(2000);
};
