import { KriyanApp } from "@/components/kriyan/KriyanApp";
import { getGardenData } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function GardenPage() {
  return <KriyanApp initialData={getGardenData()} />;
}
