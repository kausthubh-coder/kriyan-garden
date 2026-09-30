"use client";
import { useId, useState } from "react";
import { parseTimeInput, timeValue } from "@kriyan/core";
import s from "./Onboarding.module.css";
export function TimeField({
  label,
  value,
  change,
  save,
  required = false,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  save?: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  const [error, setError] = useState("");
  return (
    <label className={`${s.field} ${s.time}`}>
      <span className={s.label}>{label}</span>
      <input
        className={s.input}
        type="text"
        inputMode="text"
        autoComplete="off"
        value={value}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? id : undefined}
        placeholder="10:00"
        onChange={(e) => {
          setError("");
          change(e.target.value);
        }}
        onBlur={() => {
          const parsed = parseTimeInput(value);
          if (parsed === null || (required && !parsed)) {
            setError("Enter a time such as 10:15, between 00:00 and 23:59.");
            return;
          }
          change(parsed ? timeValue(parsed, null) : "");
          save?.(parsed);
        }}
      />
      {error && (
        <span id={id} role="alert" className={`${s.feedback} ${s.error}`}>
          {error}
        </span>
      )}
    </label>
  );
}
