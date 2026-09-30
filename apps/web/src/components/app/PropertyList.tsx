"use client";
import { useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import s from "./App.module.css";

export type Property = {
  id: string;
  label: string;
  value: ReactNode;
  empty?: boolean;
  urgent?: boolean;
  editor: ReactNode;
};

/** One expanded editor, shared by task and goal details. */
export function PropertyList({
  rows,
  open,
  setOpen,
}: {
  rows: Property[];
  open: string | null;
  setOpen: (id: string | null) => void;
}) {
  const prefix = useId();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className={s.properties}
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current
            ?.querySelector<HTMLButtonElement>(`[data-property="${open}"]`)
            ?.focus();
          setOpen(null);
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        if (
          !(event.target instanceof Element) ||
          !event.target.matches("[data-property]")
        )
          return;
        const buttons = [
          ...(ref.current?.querySelectorAll<HTMLButtonElement>(
            "[data-property]",
          ) ?? []),
        ];
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        event.preventDefault();
        buttons[
          (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length
        ]?.focus();
      }}
    >
      {rows.map((row) => (
        <div className={s.property} key={row.id} data-open={open === row.id}>
          <button
            type="button"
            className={s.propertyButton}
            data-property={row.id}
            aria-expanded={open === row.id}
            aria-controls={`${prefix}-${row.id}`}
            onClick={() => setOpen(open === row.id ? null : row.id)}
          >
            <span className={s.propertyKey}>{row.label}</span>
            <span
              className={`${s.propertyValue} ${row.empty ? s.quiet : ""} ${row.urgent ? s.bad : ""}`}
            >
              {row.value}
            </span>
            <Icon name="down" />
          </button>
          {open === row.id && (
            <div
              id={`${prefix}-${row.id}`}
              role="group"
              aria-label={`${row.label} editor`}
              className={s.propertyEditor}
            >
              {row.editor}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
