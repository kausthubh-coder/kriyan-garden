"use client";
import { useState } from "react";
import { addDays, weekdayName } from "@kriyan/core";
import s from "./App.module.css";

/** Native fields are disclosed only when the person chooses Pick a day. */
export function DateEditor({
  value,
  today,
  label,
  clearLabel = "None",
  required = false,
  clearDisabled = false,
  change,
  pickerOnly = false,
}: {
  value: string | null;
  today: string;
  label: string;
  clearLabel?: string;
  required?: boolean;
  clearDisabled?: boolean;
  change: (value: string | null) => void;
  pickerOnly?: boolean;
}) {
  const [picking, setPicking] = useState(pickerOnly);
  return (
    <>
      {!pickerOnly && [0, 1, 2, 3].map((offset) => {
        const date = addDays(today, offset);
        return (
          <button
            type="button"
            key={date}
            className={`${s.f} ${value === date ? s.on : ""}`}
            aria-pressed={value === date}
            onClick={() => change(date)}
          >
            {offset === 0
              ? "Today"
              : offset === 1
                ? "Tomorrow"
                : weekdayName(date).slice(0, 3)}
          </button>
        );
      })}
      {!pickerOnly && !required && (
        <button
          type="button"
          className={`${s.f} ${value === null ? s.on : ""}`}
          aria-pressed={value === null}
          disabled={clearDisabled}
          onClick={() => change(null)}
        >
          {clearLabel}
        </button>
      )}
      {!pickerOnly && <button
        type="button"
        className={s.f}
        aria-expanded={picking}
        onClick={() => setPicking(!picking)}
      >
        Pick a day
      </button>}
      {picking && (
        <input
          type="date"
          aria-label={label}
          value={value ?? ""}
          required={required}
          onChange={(event) => {
            if (event.target.value || !required)
              change(event.target.value || null);
          }}
        />
      )}
    </>
  );
}
