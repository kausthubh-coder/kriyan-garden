"use client";
import { useCallback, useMemo, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { TaskPatch, TaskCreate } from "@kriyan/backend/convex/validators";
import type { Task } from "./types";
import type { ToastMessage } from "./Toast";
import {
  cacheTask,
  optimisticCreate,
  optimisticPatch,
  optimisticStatus,
  taskValues,
} from "./optimistic";

export function useTaskActions(close: () => void) {
  const client = useConvex();
  const updateMutation = useMutation(api.tasks.update),
    createMutation = useMutation(api.tasks.create),
    completeMutation = useMutation(api.tasks.complete),
    reopenMutation = useMutation(api.tasks.reopen),
    removeMutation = useMutation(api.tasks.remove);
  const update = useMemo(
    () => updateMutation.withOptimisticUpdate(optimisticPatch),
    [updateMutation],
  );
  const create = useMemo(
    () => createMutation.withOptimisticUpdate(optimisticCreate),
    [createMutation],
  );
  const complete = useMemo(
    () =>
      completeMutation.withOptimisticUpdate((store, args) =>
        optimisticStatus(store, args.id, "completed"),
      ),
    [completeMutation],
  );
  const reopen = useMemo(
    () =>
      reopenMutation.withOptimisticUpdate((store, args) =>
        optimisticStatus(store, args.id, "active"),
      ),
    [reopenMutation],
  );
  const remove = useMemo(
    () =>
      removeMutation.withOptimisticUpdate((store, args) =>
        cacheTask(store, args.id, null),
      ),
    [removeMutation],
  );
  const [toast, setToast] = useState<ToastMessage | null>(null),
    [error, setError] = useState("");
  const [failedAction, setFailedAction] = useState<
    (() => Promise<unknown>) | null
  >(null);
  const show = useCallback(
    (text: string, undo?: () => Promise<void>) =>
      setToast({ id: Date.now(), text, undo }),
    [],
  );
  const failure = useCallback(
    (error: unknown, retry?: () => Promise<unknown>) => {
      setToast(null);
      setFailedAction(() => retry ?? null);
      setError(
        error instanceof Error
          ? error.message
          : "Your change could not be saved. Try the change again.",
      );
    },
    [],
  );
  const patch = useCallback(
    (task: Task, patch: TaskPatch, message: string) => {
      const previous: TaskPatch = {};
      for (const key of Object.keys(patch) as (keyof TaskPatch)[])
        Object.assign(previous, { [key]: task[key] });
      if (patch.date === null) previous.time = task.time;
      const pending = update({ id: task._id, patch });
      show(message, async () => {
        await pending;
        await update({ id: task._id, patch: previous });
      });
      void pending.catch((error: unknown) =>
        failure(error, () => update({ id: task._id, patch })),
      );
    },
    [update, show, failure],
  );
  const toggle = useCallback(
    (task: Task) => {
      const done = task.status === "completed";
      // Capture the active IDs before completing a repeating task so Undo also
      // removes the occurrence created by this exact completion.
      const run = async () => {
        const before =
          task.repeat && !done
            ? await client.query(api.tasks.list, { status: "active" })
            : [];
        await (done ? reopen : complete)({ id: task._id });
        if (!task.repeat || done) return [];
        const after = await client.query(api.tasks.list, { status: "active" });
        const known = new Set(before.map((row) => row._id));
        return after.filter(
          (row) =>
            !known.has(row._id) &&
            row.title === task.title &&
            row.areaId === task.areaId &&
            row.projectId === task.projectId &&
            row.goalId === task.goalId &&
            row.notes === task.notes &&
            JSON.stringify(row.repeat) === JSON.stringify(task.repeat),
        );
      };
      const pending = run();
      show(`${done ? "Reopened" : "Done"}: ${task.title}`, async () => {
        const occurrences = await pending;
        if (occurrences.length > 1)
          throw new Error(
            "Repeat changed in another session. Check the next occurrence before undoing.",
          );
        for (const occurrence of occurrences)
          await remove({ id: occurrence._id });
        if (done && task.repeat) {
          await update({ id: task._id, patch: { repeat: null } });
          await complete({ id: task._id });
          await update({ id: task._id, patch: { repeat: task.repeat } });
        } else await (done ? complete : reopen)({ id: task._id });
      });
      void pending.catch((error: unknown) => failure(error, run));
    },
    [client, complete, reopen, remove, update, show, failure],
  );
  const deleteTask = useCallback(
    (task: Task) => {
      close();
      const pending = remove({ id: task._id });
      show(`Deleted: ${task.title}`, async () => {
        await pending;
        const restored = await create({
          ...taskValues(task),
          ...(task.status === "completed" ? { repeat: null } : {}),
        });
        if (task.status === "completed") {
          await complete({ id: restored._id });
          if (task.repeat)
            await update({ id: restored._id, patch: { repeat: task.repeat } });
        }
      });
      void pending.catch((error: unknown) =>
        failure(error, () => remove({ id: task._id })),
      );
    },
    [close, remove, create, complete, update, show, failure],
  );
  const addTask = useCallback(
    (args: TaskCreate, message: string) => {
      close();
      const pending = create(args);
      show(message, async () => {
        const row = await pending;
        await remove({ id: row._id });
      });
      void pending.catch((error: unknown) =>
        failure(error, () => create(args)),
      );
    },
    [close, create, remove, show, failure],
  );
  const dismiss = useCallback(() => setToast(null), []);
  const undo = useCallback(() => {
    const action = toast?.undo;
    if (!action) return;
    dismiss();
    void action()
      .then(() => show("Change undone"))
      .catch(failure);
  }, [toast, dismiss, show, failure]);
  const edit = useCallback(
    (task: Task, patch: TaskPatch) => {
      const pending = update({ id: task._id, patch });
      if (
        patch.time !== undefined ||
        patch.date !== undefined ||
        patch.durationMinutes !== undefined
      ) {
        const previous: TaskPatch = {
          date: task.date,
          time: task.time,
          durationMinutes: task.durationMinutes,
        };
        show("Task updated", async () => {
          await pending;
          await update({ id: task._id, patch: previous });
        });
      }
      return pending;
    },
    [update, show],
  );
  const retry = useCallback(() => {
    if (!failedAction) {
      window.location.reload();
      return;
    }
    setError("");
    setFailedAction(null);
    void failedAction()
      .then(() => show("Change saved"))
      .catch((error: unknown) => failure(error, failedAction));
  }, [failedAction, show, failure]);
  return {
    patch,
    toggle,
    deleteTask,
    addTask,
    edit,
    toast,
    dismiss,
    undo,
    error,
    retry,
    clearError: () => setError(""),
  };
}
