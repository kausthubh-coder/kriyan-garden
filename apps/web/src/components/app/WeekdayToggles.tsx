import s from "./Onboarding.module.css";
export function WeekdayToggles({
  value,
  change,
}: {
  value: number[];
  change: (days: number[]) => void;
}) {
  return (
    <div className={s.days} role="group" aria-label="Weekdays">
      {[1, 2, 3, 4, 5, 6, 0].map((day) => (
        <button
          type="button"
          key={day}
          className={s.day}
          aria-label={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
          aria-pressed={value.includes(day)}
          onClick={() =>
            change(
              value.includes(day)
                ? value.filter((d) => d !== day)
                : [...value, day],
            )
          }
        >
          {["S", "M", "T", "W", "T", "F", "S"][day]}
        </button>
      ))}
    </div>
  );
}
