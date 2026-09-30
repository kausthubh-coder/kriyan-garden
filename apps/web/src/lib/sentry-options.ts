import type { ErrorEvent, StackFrame } from "@sentry/nextjs";

export function validSentryDsn(dsn: string | undefined) {
  if (!dsn) return undefined;
  try {
    const url = new URL(dsn);
    if (url.protocol !== "https:" || !url.username || url.password || url.search || url.hash || !/^\/\d+$/.test(url.pathname)) return undefined;
    return dsn;
  } catch {
    return undefined;
  }
}

function safeFrame(frame: StackFrame): StackFrame {
  // Keep only compiled application locations, never source context, local
  // filesystem prefixes, function names, arguments or query strings.
  const path = frame.filename?.split(/[?#]/, 1)[0];
  const filename = path?.match(/(?:\/_next\/static\/|[\\/]\.next[\\/]server[\\/])([\w./\\[\]-]+\.js)$/)?.[1];
  return {
    filename: filename ? `app/${filename.replaceAll("\\", "/")}` : "external",
    ...(Number.isSafeInteger(frame.lineno) ? { lineno: frame.lineno } : {}),
    ...(Number.isSafeInteger(frame.colno) ? { colno: frame.colno } : {}),
  };
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  // Reconstruct instead of redacting named keys. New SDK fields are denied
  // automatically. Raw error messages often contain planner content or tokens.
  return {
    type: undefined,
    ...(event.event_id && /^[a-f0-9]{32}$/i.test(event.event_id) ? { event_id: event.event_id } : {}),
    ...(typeof event.timestamp === "number" ? { timestamp: event.timestamp } : {}),
    platform: "javascript",
    level: "error",
    exception: {
      values: (event.exception?.values ?? [{}]).slice(0, 5).map((exception) => ({
        type: ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(exception.type ?? "") ? exception.type : "Error",
        value: "Application error. Content removed for privacy.",
        ...(exception.stacktrace?.frames ? {
          stacktrace: { frames: exception.stacktrace.frames.slice(-50).map(safeFrame) },
        } : {}),
      })),
    },
  };
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn: validSentryDsn(dsn),
    enabled: Boolean(validSentryDsn(dsn)),
    sendDefaultPii: false,
    defaultIntegrations: false as const,
    enableOpenTelemetrySetup: false,
    sendClientReports: false,
    enableLogs: false,
    enableMetrics: false,
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendLog: () => null,
  };
}
