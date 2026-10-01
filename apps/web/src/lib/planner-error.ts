import { ConvexError } from "convex/values";

export function plannerError(error: unknown, fallback: string): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return error instanceof Error ? error.message : fallback;
}
