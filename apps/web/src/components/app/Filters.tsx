import { areaColor, type Area } from "./types";
import s from "./App.module.css";
export function Filters({
  areas,
  filter,
  onChange,
}: {
  areas: Area[];
  filter: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={s.filters} aria-label="Filter by area">
      <button
        className={`${s.f} ${filter === "all" ? s.on : ""}`}
        aria-pressed={filter === "all"}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {areas.map((area) => (
        <button
          key={area._id}
          className={`${s.f} ${filter === area._id ? s.on : ""}`}
          style={{ "--c": areaColor(area) } as React.CSSProperties}
          aria-pressed={filter === area._id}
          onClick={() => onChange(area._id)}
        >
          <i className={s.dot} />
          {area.name}
        </button>
      ))}
    </div>
  );
}
