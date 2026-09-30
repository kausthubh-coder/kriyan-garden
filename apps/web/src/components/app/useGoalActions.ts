"use client";
import { useCallback, useState } from "react";
import { useGoalTransport } from "./dataAccess";
import type { Goal } from "./types";
import type { ToastMessage } from "./Toast";

export function useGoalActions(close: () => void) {
  const { deleteForUndo: remove, restore } = useGoalTransport();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [error, setError] = useState("");
  const [failedUndo, setFailedUndo] = useState<(() => Promise<void>) | null>(
    null,
  );
  const dismiss = useCallback(() => setToast(null), []);
  async function deleteGoal(goal: Goal) {
    const snapshot = await remove({ id: goal._id });
    close();
    setToast({
      id: Date.now(),
      text: `Deleted: ${goal.title}`,
      undo: async () => {
        await restore({ snapshot });
      },
    });
  }
  function undo(action = toast?.undo) {
    if (!action) return;
    setError("");
    setFailedUndo(null);
    setToast(null);
    void action()
      .then(() => setToast({ id: Date.now(), text: "Change undone" }))
      .catch((failure: unknown) => {
        setFailedUndo(() => action);
        setError(
          `${failure instanceof Error ? failure.message : "Goal could not be restored."} Try undoing again.`,
        );
        setToast({
          id: Date.now(),
          text: "Goal could not be restored",
          undo: action,
        });
      });
  }
  return {
    deleteGoal,
    toast,
    dismiss,
    undo: () => undo(),
    retryUndo: () => {
      if (failedUndo) undo(failedUndo);
    },
    error,
    clearError: () => setError(""),
  };
}
