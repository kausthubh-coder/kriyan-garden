"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Profile } from "./types";
import s from "./Onboarding.module.css";

export const SetupSaveContext = createContext<((save: Promise<boolean>) => void) | null>(null);

export function useInlineSave() {
  const register = useContext(SetupSaveContext);
  const [feedback, setFeedback] = useState<
    Record<string, { error?: string; saved?: boolean; busy?: boolean }>
  >({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queues = useRef<Record<string, Promise<boolean>>>({});
  useEffect(
    () => () => Object.values(timers.current).forEach(clearTimeout),
    [],
  );
  function run(key: string, work: () => Promise<unknown>): Promise<boolean> {
    const next = async () => {
      clearTimeout(timers.current[key]);
      setFeedback((old) => ({ ...old, [key]: { busy: true } }));
      try {
        await work();
        setFeedback((old) => ({ ...old, [key]: { saved: true } }));
        timers.current[key] = setTimeout(
          () => setFeedback((old) => ({ ...old, [key]: {} })),
          2200,
        );
        return true;
      } catch (error) {
        setFeedback((old) => ({
          ...old,
          [key]: {
            error: `${error instanceof Error ? error.message : "This change could not be saved."} Check the field and try again.`,
          },
        }));
        return false;
      }
    };
    const result = (queues.current[key] ?? Promise.resolve(true)).then(next);
    queues.current[key] = result;
    register?.(result);
    return result;
  }
  return { run, feedback };
}
export function SaveFeedback({
  state,
}: {
  state?: { error?: string; saved?: boolean; busy?: boolean };
}) {
  if (state?.error)
    return (
      <span className={`${s.feedback} ${s.error}`} role="alert">
        {state.error}
      </span>
    );
  if (state?.saved || state?.busy)
    return (
      <span className={s.feedback} role="status">
        {state.busy ? "Saving…" : "Saved"}
      </span>
    );
  return null;
}
/** Draft patches merge on the backend, so independent inputs cannot overwrite each other. */
export function useSetupDraft(
  prefix: string,
  defaults: Record<string, string>,
  profile?: Profile,
) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [
        key,
        profile?.onboardingDraft?.[`${prefix}.${key}`] ?? value,
      ]),
    ),
  );
  const save = useMutation(api.profiles.saveOnboarding);
  const action = useInlineSave();
  const pending = useRef<Promise<boolean>>(Promise.resolve(true));
  function change(patch: Record<string, string>) {
    setValues((old) => ({ ...old, ...patch }));
    if (profile) {
      const drafts = Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [
          `${prefix}.${key}`,
          value,
        ]),
      );
      pending.current = action.run("draft", () => save({ drafts }));
    }
  }
  return { values, change, pending, feedback: action.feedback.draft };
}
