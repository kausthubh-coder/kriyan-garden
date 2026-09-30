import { apiRoute } from "@/lib/operations/http";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiRoute("update_task", { id })(request);
}
