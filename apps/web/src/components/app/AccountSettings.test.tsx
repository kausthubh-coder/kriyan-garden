// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AccountSettings } from "./AccountSettings";

const state = vi.hoisted(() => ({ mode: "loading", mounts: 0 }));
vi.mock("@clerk/nextjs", () => ({ UserProfile: ({ fallback }: { fallback: React.ReactNode }) => {
  state.mounts++;
  if (state.mode === "failure") throw new Error("private user content and identity");
  return state.mode === "loading" ? fallback : <p>Account ready</p>;
} }));
vi.mock("@/lib/report-error", () => ({ reportError: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); state.mode = "loading"; state.mounts = 0; });

test("slow account loading offers a working retry rather than an endless status", () => {
  vi.useFakeTimers(); render(<AccountSettings />);
  expect(screen.getByRole("status").textContent).toContain("Loading account settings.");
  act(() => vi.advanceTimersByTime(15_000));
  expect(screen.getByRole("status").textContent).toContain("Check your connection");
  state.mode = "ready";
  fireEvent.click(screen.getByRole("button", { name: "Load account settings" }));
  expect(screen.getByText("Account ready")).toBeTruthy();
});
test("account rendering failures keep a private, recoverable error state", () => {
  // React reports the intentionally thrown fixture to the test console.
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.mode = "failure"; render(<AccountSettings />);
  expect(screen.getByRole("alert").textContent).toContain("Account settings could not be loaded");
  expect(screen.getByRole("alert").textContent).not.toContain("private user content");
  state.mode = "ready";
  fireEvent.click(screen.getByRole("button", { name: "Load account settings" }));
  expect(screen.getByText("Account ready")).toBeTruthy();
});
