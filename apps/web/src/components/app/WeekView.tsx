import { ComingSoon } from "./ComingSoon";
export function WeekView({ goDay }: { goDay: () => void }) {
  return <ComingSoon title="Week" goDay={goDay} />;
}
