import { z } from "zod";

export class OperationError extends Error {
  constructor(public code: string, message: string, public status = 400, public candidates?: readonly { id: string; name: string; path?: string }[]) { super(message); }
}
/** Do not expose Convex stack traces, signed arguments or SDK diagnostics. */
export function publicError(error: unknown): OperationError {
  if (error instanceof OperationError) return error;
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return new OperationError("INVALID_INPUT", `Check ${issue?.path.join(".") || "the request fields"}. ${issue?.message ?? "Enter valid values."}`);
  }
  const message = error instanceof Error ? error.message : "";
  if (/RATE_LIMITED|Too many calls/.test(message)) return new OperationError("RATE_LIMITED", "Too many calls. Wait a minute and try again.", 429);
  if (/Could not find|not configured|Service is not configured|Invalid service signature/.test(message)) return new OperationError("SERVICE_UNAVAILABLE", "The planner service is unavailable. Ask the administrator to check its deployment and settings.", 503);
  if (/Record not found/.test(message)) return new OperationError("NOT_FOUND", "Record not found. Read the list and check the ID.", 404);
  if (/ArgumentValidationError|Invalid ID/.test(message)) return new OperationError("INVALID_INPUT", "Check the record ID and request fields, then try again.");
  if (/Invalid goal progress/.test(message)) return new OperationError("INVALID_INPUT", "Use a nonnegative value for a number goal, or complete its linked tasks or milestones.");
  // Only allow messages from the shared model's input rules, never arbitrary SDK text.
  const known = message.match(/(?:Invalid (?:date|time|repeat interval|weekday|reminder|number)\.|A time needs a date\.|A repeating task needs a date\.|Project belongs to another area\.|No areas available\.|Repeat weekdays need|Limit of \d+ (?:active tasks|areas|projects|goals)|Too many tasks to filter\.)[^\n]*/);
  if (known) return new OperationError("INVALID_INPUT", known[0].replace(/\s+at\s.*$/, "").slice(0, 200));
  return new OperationError("INTERNAL_ERROR", "The request could not be completed. Try again or contact support.", 500);
}
