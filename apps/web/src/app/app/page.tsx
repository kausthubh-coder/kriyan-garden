import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
export default function AppPage() {
  return (
    <Suspense
      fallback={
        <main className="placeholder">
          <p role="status">Loading your planner.</p>
        </main>
      }
    >
      <AppShell />
    </Suspense>
  );
}
