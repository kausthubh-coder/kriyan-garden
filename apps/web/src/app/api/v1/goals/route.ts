import { apiRoute } from "@/lib/operations/http";
export const GET = apiRoute("list_goals");
export const POST = apiRoute("create_goal", { created: true });
