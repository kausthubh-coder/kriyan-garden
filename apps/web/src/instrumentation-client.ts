import { sentryOptions } from "./lib/sentry-options";

const options = sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN);
if (options.enabled) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ ...options, integrations: [Sentry.globalHandlersIntegration()] });
  });
}
