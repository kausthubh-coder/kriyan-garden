"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Dialog({
  label,
  className,
  close,
  children,
  initialFocus,
}: {
  label: string;
  className: string;
  close: () => void;
  children: ReactNode;
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog)
      dialog.dataset.animation =
        dialog.closest("[data-input]")?.getAttribute("data-input") ??
        "keyboard";
    dialog?.showModal();
    if (initialFocus) dialog?.querySelector<HTMLElement>(initialFocus)?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [initialFocus]);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          close();
      }}
    >
      {children}
    </dialog>
  );
}
