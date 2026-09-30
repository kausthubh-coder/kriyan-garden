import { areaColor, type Area, type Variables } from "./types";
import s from "./Onboarding.module.css";
export function AreaChips({
  areas,
  value,
  change,
}: {
  areas: Area[];
  value: string | null;
  change: (value: Area["_id"]) => void;
}) {
  return (
    <div className={s.chips} role="group" aria-label="Area">
      {areas.map((area) => (
        <button
          type="button"
          key={area._id}
          className={`${s.chip} ${value === area._id ? s.chipOn : ""}`}
          style={{ "--c": areaColor(area) } as Variables}
          aria-pressed={value === area._id}
          onClick={() => change(area._id)}
        >
          <i className={s.dot} />
          {area.name}
        </button>
      ))}
    </div>
  );
}
