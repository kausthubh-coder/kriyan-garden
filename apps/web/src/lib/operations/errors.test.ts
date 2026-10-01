import { expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { publicError } from "./errors";

test.each([
  ["Record not found. Check the ID and try again.", 404, "NOT_FOUND"],
  ["A task title must be 180 characters or fewer. Shorten the title and try again.", 400, "INVALID_INPUT"],
  ["A time needs a date. Supply a date in the same call.", 400, "INVALID_INPUT"],
  [{ code: "RATE_LIMITED", retryAfter: 60000 }, 429, "RATE_LIMITED"],
] as const)("production Convex data maps to the public status: %s", (data, status, code) => {
  const error = new ConvexError(data);
  error.message = "Server Error";
  expect(publicError(error)).toMatchObject({ status, code });
});

test("unexpected Convex data stays private", () => {
  expect(publicError(new ConvexError("Private service arguments and diagnostics"))).toMatchObject({ status: 500, message: "The request could not be completed. Try again or contact support." });
});
