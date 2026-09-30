import type { Metadata } from "next";
import { Demo } from "@/components/demo/Demo";
export const metadata: Metadata = { title: "Try the demo", description: "Try Kriyan with sample tasks. No sign-in, no saved data.", robots: { index: false, follow: true } };
export default function DemoPage() { return <Demo />; }
