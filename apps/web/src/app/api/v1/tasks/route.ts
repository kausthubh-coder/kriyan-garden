import { apiRoute } from "@/lib/operations/http";
export const GET = apiRoute("list_tasks");
export const POST = apiRoute("create_task", { created: true });
