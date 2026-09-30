import { ComingSoon } from "./ComingSoon";
export function Onboarding({ goDay }: { goDay: () => void }) {
  return <ComingSoon title="Onboarding" goDay={goDay} />;
}
