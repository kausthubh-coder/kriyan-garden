"use client";
import { createContext, useContext, useMemo } from "react";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@kriyan/backend/convex/_generated/api";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import { useConvexPlanner } from "./usePlanner";
import { optimisticCreate, optimisticPatch, optimisticStatus, cacheTask } from "./optimistic";

function useConvexTasks() {
  const client = useConvex();
  const update = useMutation(api.tasks.update), create = useMutation(api.tasks.create),
    complete = useMutation(api.tasks.complete), reopen = useMutation(api.tasks.reopen), remove = useMutation(api.tasks.remove);
  return useMemo(() => ({
    update: update.withOptimisticUpdate(optimisticPatch), create: create.withOptimisticUpdate(optimisticCreate),
    complete: complete.withOptimisticUpdate((store, args) => optimisticStatus(store, args.id, "completed")),
    reopen: reopen.withOptimisticUpdate((store, args) => optimisticStatus(store, args.id, "active")),
    remove: remove.withOptimisticUpdate((store, args) => cacheTask(store, args.id, null)),
    listActive: () => client.query(api.tasks.list, { status: "active" }),
  }), [client, update, create, complete, reopen, remove]);
}
function useConvexGoals() {
  return {
    create: useMutation(api.goals.create),
    update: useMutation(api.goals.update),
    createMilestone: useMutation(api.goals.createMilestone),
    updateMilestone: useMutation(api.goals.updateMilestone),
    removeMilestone: useMutation(api.goals.removeMilestone),
  };
}
function useConvexSelectedTask(id: string | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.tasks.get, id && isAuthenticated && !id.startsWith("optimistic-") ? { id: id as Id<"tasks"> } : "skip");
}
// Implementations are selected by the provider and stay fixed for its lifetime.
export interface PlannerDataAccess {
  usePlanner: typeof useConvexPlanner;
  useTasks: () => TaskTransport;
  useGoals: () => GoalTransport;
  useSelectedTask: typeof useConvexSelectedTask;
}
export type TaskTransport = { [K in keyof ReturnType<typeof useConvexTasks>]: (...args: Parameters<ReturnType<typeof useConvexTasks>[K]>) => ReturnType<ReturnType<typeof useConvexTasks>[K]> };
export type GoalTransport = { [K in keyof ReturnType<typeof useConvexGoals>]: (...args: Parameters<ReturnType<typeof useConvexGoals>[K]>) => ReturnType<ReturnType<typeof useConvexGoals>[K]> };
export const PlannerDataContext = createContext<PlannerDataAccess>({ usePlanner: useConvexPlanner, useTasks: useConvexTasks, useGoals: useConvexGoals, useSelectedTask: useConvexSelectedTask });
export function usePlannerData(date: string | null) {
  const { usePlanner } = useContext(PlannerDataContext);
  return usePlanner(date);
}
export function useTaskTransport() {
  const { useTasks } = useContext(PlannerDataContext);
  return useTasks();
}
export function useGoalActions() {
  const { useGoals } = useContext(PlannerDataContext);
  return useGoals();
}
export function useSelectedTask(id: string | null) {
  const { useSelectedTask: useSelected } = useContext(PlannerDataContext);
  return useSelected(id);
}
