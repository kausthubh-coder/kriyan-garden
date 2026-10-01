import { expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { plannerError } from "./planner-error";

test("a production model refusal retains its recovery instruction", () => {
  const error = new ConvexError("Area is in use. Move or remove its records first.");
  error.message = "Server Error";
  expect(plannerError(error, "Try again.")).toBe("Area is in use. Move or remove its records first.");
});

test("unknown data uses the caller's fallback", () => {
  expect(plannerError(null, "Try again.")).toBe("Try again.");
});
