import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { OnboardingFrameSkeleton } from "@/components/app/OnboardingFrameSkeleton";
export default function WelcomePage() {
  return (
    <Suspense fallback={<OnboardingFrameSkeleton />}>
      <AppShell />
    </Suspense>
  );
}
