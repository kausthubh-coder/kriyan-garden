import Link from "next/link";
import { KRIYAN_APP_ORIGIN } from "@/lib/origins";
export default function Home() {
  const href = process.env.NODE_ENV === "development" ? "/app" : `${KRIYAN_APP_ORIGIN}/app`;
  return <main className="placeholder"><h1>Kriyan</h1><p>A planner for tasks and goals across School, Business and Life.</p><Link href={href}>Open planner</Link></main>;
}
