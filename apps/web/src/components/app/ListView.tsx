import { ComingSoon } from "./ComingSoon";
export function ListView({ goDay }: { goDay: () => void }) {
  return <ComingSoon title="List" goDay={goDay} />;
}
