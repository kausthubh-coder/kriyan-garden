import { headers } from "next/headers";
import { PageNotFound } from "@/components/PageNotFound";

export default async function NotFound() {
  const request = await headers();
  const host = request.get("host")?.split(":")[0];
  const path = request.get("x-kriyan-path") ?? "";
  return <PageNotFound appHost={host === "app.kriyan.app" || path === "/app" || path.startsWith("/app/")} />;
}
