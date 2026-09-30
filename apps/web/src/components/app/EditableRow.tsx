"use client";
import { useId, type ReactNode } from "react";
import { Icon } from "./Icon";
import s from "./Onboarding.module.css";
export function EditableRow({
  title,
  summary,
  leading,
  open,
  toggle,
  children,
  remove,
  className = "",
  chevron = true,
}: {
  title: string;
  summary?: ReactNode;
  leading?: ReactNode;
  open?: boolean;
  toggle?: () => void;
  children?: ReactNode;
  remove?: () => void;
  className?: string;
  chevron?: boolean;
}) {
  const id = useId();
  return (
    <>
      <div
        className={`${s.row} ${open ? s.rowOpen : ""} ${className}`}
        data-editable-row
      >
        {leading}
        {toggle ? (
          <button
            type="button"
            className={s.rowName}
            aria-expanded={open}
            aria-controls={id}
            onClick={toggle}
          >
            {title}
          </button>
        ) : (
          <span className={s.rowName}>{title}</span>
        )}
        {summary && <span className={s.rowSummary}>{summary}</span>}
        {toggle && chevron && (
          <button
            type="button"
            className={s.icon}
            aria-label={`Edit ${title}`}
            aria-expanded={open}
            onClick={toggle}
          >
            <Icon name="down" />
          </button>
        )}
        {remove && (
          <button
            type="button"
            className={s.icon}
            aria-label={`Remove ${title}`}
            onClick={remove}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      {open && (
        <div id={id} className={s.inlineEdit}>
          {children}
        </div>
      )}
    </>
  );
}
