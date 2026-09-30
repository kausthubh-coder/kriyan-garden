import { validSentryDsn } from "./sentry-options";

export function reportError(error: Error) {
  if (!validSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
}
