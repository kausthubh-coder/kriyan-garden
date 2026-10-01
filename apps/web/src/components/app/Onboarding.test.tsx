// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getFunctionName, type FunctionReference } from "convex/server";
import { Onboarding } from "./Onboarding";
import { AreasRows } from "./SetupEditors";
import { createDemoStore } from "../demo/store";

const state = vi.hoisted(() => ({
  step: "4", push: vi.fn(),
  save: vi.fn(async () => ({})),
  create: vi.fn(async () => ({ _id: "created-goal" })),
  update: vi.fn(async (args: Record<string, unknown>) => ({ _id: typeof args.id === "string" ? args.id : "created-goal" })),
  areaUpdate: vi.fn(async () => ({})),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ step: state.step }),
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut: vi.fn() }) }));
vi.mock("convex/react", () => ({
  useMutation: (reference: FunctionReference<"mutation">) => {
    switch (getFunctionName(reference)) {
      case "profiles:saveOnboarding": return state.save;
      case "goals:create": return state.create;
      case "goals:update": return state.update;
      case "areas:update": return state.areaUpdate;
      default: return vi.fn(async () => ({}));
    }
  },
}));
beforeEach(() => { vi.clearAllMocks(); state.step = "4"; });
afterEach(() => { cleanup(); });
function fixture() {
  const data = createDemoStore("2026-09-30").snapshot();
  return { ...data, profile: { ...data.profile, onboardingComplete: false } };
}
function onboarding() {
  const data = fixture();
  render(<Onboarding areas={data.areas} projects={[]} events={[]} goals={[]} tasks={[]}
    profile={data.profile} today="2026-09-30" now={600} finish={vi.fn()} />);
}
test("rapid goal edits share one creation and Continue waits for its save", async () => {
  let resolveCreate: ((value: { _id: string }) => void) | undefined;
  state.create.mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));
  onboarding();
  const title = screen.getByRole("textbox", { name: "Goal title" });
  fireEvent.change(title, { target: { value: "Read ten books" } });
  fireEvent.blur(title);
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "A number" }));
  fireEvent.click(screen.getByRole("button", { name: "In 3 months" }));
  expect(state.update).not.toHaveBeenCalled();
  const unit = screen.getByRole("textbox", { name: "Unit" });
  fireEvent.change(unit, { target: { value: "books" } });
  fireEvent.blur(unit);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(state.push).not.toHaveBeenCalled();
  await act(async () => { resolveCreate?.({ _id: "created-goal" }); });
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/app/welcome?step=5", { scroll: false }));
  expect(state.create).toHaveBeenCalledTimes(1);
  expect(state.update).toHaveBeenCalledTimes(1);
  expect(state.update.mock.calls[0]?.[0]).toMatchObject({ id: "created-goal", patch: { title: "Read ten books", metric: { kind: "number", unit: "books" } } });
});
test("the final area stays in place with a recoverable inline explanation", () => {
  const area = fixture().areas[0];
  if (!area) throw new Error("Missing area fixture.");
  render(<AreasRows areas={[area]} onboarding />);
  fireEvent.click(screen.getByRole("button", { name: `Remove ${area.name}` }));
  expect(screen.getByRole("alert").textContent).toBe("Keep at least one area.");
  expect(screen.getByRole("button", { name: area.name })).toBeTruthy();
});

test("Continue accepts a corrected goal after an earlier queued save fails", async () => {
  let rejectEarlier: ((error: Error) => void) | undefined;
  state.update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectEarlier = reject; }));
  onboarding();
  const title = screen.getByRole("textbox", { name: "Goal title" });
  fireEvent.change(title, { target: { value: "Read ten books" } });
  fireEvent.blur(title);
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "A number" }));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
  const unit = screen.getByRole("textbox", { name: "Unit" });
  fireEvent.change(unit, { target: { value: "books" } });
  fireEvent.blur(unit);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await act(async () => rejectEarlier?.(new Error("A number needs a unit")));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/app/welcome?step=5", { scroll: false }));
});
test("Escape cancels an area rename without saving the abandoned text", () => {
  const area = fixture().areas[0];
  if (!area) throw new Error("Missing area fixture.");
  render(<AreasRows areas={[area]} onboarding />);
  fireEvent.click(screen.getByRole("button", { name: area.name }));
  const input = screen.getByRole("textbox", { name: "Area name" });
  fireEvent.change(input, { target: { value: "Abandoned name" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.getByRole("button", { name: area.name })).toBeTruthy();
  expect(state.areaUpdate).not.toHaveBeenCalled();
});
