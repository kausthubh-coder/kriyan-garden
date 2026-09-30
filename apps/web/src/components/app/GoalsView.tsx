import { ComingSoon } from "./ComingSoon";
export function GoalsView({ goDay }: { goDay: () => void }) {
  return <ComingSoon title="Goals" goDay={goDay} />;
}
