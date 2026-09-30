import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "@kriyan/backend/convex/_generated/api";
import { canonicalJson } from "@kriyan/backend/convex/canonical";
import type { Id } from "@kriyan/backend/convex/_generated/dataModel";
import type { TaskCreate, TaskPatch } from "@kriyan/backend/convex/validators";

function configuration() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.SERVICE_SECRET || process.env.MCP_SERVICE_SECRET;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  if (!secret) throw new Error("SERVICE_SECRET is not configured");
  return { convex: new ConvexHttpClient(url, { logger: false }), secret };
}
export type ServiceInvocation = { id: string; kind: "read" | "write" };
type Envelope = { ownerId: string; timestamp: number; nonce: string; signature: string; invocation?: ServiceInvocation };
export function serviceCall<F extends FunctionReference<"action">>(ref: F, ownerId: string, operation: string, payload: Omit<FunctionArgs<F>, keyof Envelope>, invocation?: ServiceInvocation): Promise<FunctionReturnType<F>> {
  const { convex, secret } = configuration();
  const timestamp = Date.now(), nonce = randomUUID();
  const signedPayload = { ...payload, ...(invocation ? { invocation } : {}) };
  const signature = createHmac("sha256", secret).update(canonicalJson([timestamp, nonce, ownerId, operation, signedPayload])).digest("hex");
  return convex.action(ref, { ...signedPayload, ownerId, timestamp, nonce, signature } as FunctionArgs<F>);
}
export const serviceClient = {
  listTasks: (ownerId: string, status: "active" | "completed" | undefined, limit: number) => serviceCall(api.service.tasksList, ownerId, "tasks.list", { ...(status ? { status } : {}), limit }),
  getTask: (ownerId: string, id: string) => serviceCall(api.service.tasksGet, ownerId, "tasks.get", { id: id as Id<"tasks"> }),
  listSpaces: (ownerId: string) => serviceCall(api.service.projectsList, ownerId, "projects.list", {}),
  async createSpace(ownerId: string, name: string, areaId?: string) {
    const areas = await serviceCall(api.service.areasList, ownerId, "areas.list", {});
    const selectedArea = areaId ? areas.find((area) => area._id === areaId) : areas[0];
    if (!selectedArea) throw new Error("Area not found. Initialize your profile or choose an existing area.");
    return serviceCall(api.service.projectsCreate, ownerId, "projects.create", { name, areaId: selectedArea._id });
  },
  searchNotes: (ownerId: string, query: string, limit: number) => serviceCall(api.service.tasksSearch, ownerId, "tasks.search", { query, limit }),
  createTask: (ownerId: string, input: TaskCreate) => serviceCall(api.service.tasksCreate, ownerId, "tasks.create", input),
  updateTask: (ownerId: string, id: string, patch: TaskPatch) => serviceCall(api.service.tasksUpdate, ownerId, "tasks.update", { id: id as Id<"tasks">, patch }),
  completeTask: (ownerId: string, id: string, completed: boolean) => serviceCall(completed ? api.service.tasksComplete : api.service.tasksReopen, ownerId, completed ? "tasks.complete" : "tasks.reopen", { id: id as Id<"tasks"> }),
};
