export class CliError extends Error {
  constructor(message: string, readonly exitCode: 1 | 2 | 3 = 1, readonly details?: unknown) {
    super(message);
    this.name = "CliError";
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError("Kriyan returned an invalid response. Try again.");
  }
  return value as Record<string, unknown>;
}

export function errorMessage(error: unknown): string {
  return error instanceof CliError ? error.message : "The command failed. Check your connection and try again.";
}
