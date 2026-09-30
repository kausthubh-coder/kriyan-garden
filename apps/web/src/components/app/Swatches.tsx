import { useId, useState } from "react";
import { namedAreaColors } from "@kriyan/core";
import type { Area, Variables } from "./types";
import s from "./Onboarding.module.css";
export function Swatches({
  value,
  change,
  disabled = false,
}: {
  value: Area["color"];
  change: (color: Area["color"]) => Promise<boolean>;
  disabled?: boolean;
}) {
  const name = useId();
  const [choice, setChoice] = useState({ source: value, selected: value });
  const selected = choice.source === value ? choice.selected : value;
  return (
    <fieldset className={s.swatches} aria-label="Colour" disabled={disabled}>
      {(Object.entries(namedAreaColors) as [Area["color"], string][]).map(
        ([color, fill]) => (
          <label
            className={s.swatch}
            key={color}
            style={{ "--c": fill } as Variables}
            title={color[0].toUpperCase() + color.slice(1)}
          >
            <input
              type="radio"
              name={name}
              aria-label={color[0].toUpperCase() + color.slice(1)}
              checked={selected === color}
              onChange={() => {
                setChoice({ source: value, selected: color });
                void change(color).then((saved) => { if (!saved) setChoice({ source: value, selected: value }); });
              }}
            />
            <span aria-hidden="true" />
          </label>
        ),
      )}
    </fieldset>
  );
}
