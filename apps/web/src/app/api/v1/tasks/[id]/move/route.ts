import { apiRoute } from "@/lib/operations/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiRoute("move_task", { id })(request);
}
