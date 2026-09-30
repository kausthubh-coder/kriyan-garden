"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Dialog({
  label,
  className,
  close,
  children,
  initialFocus,
  escape,
  focusOnTouch = false,
}: {
  label: string;
  className: string;
  close: () => void;
  children: ReactNode;
  initialFocus?: string;
  escape?: () => void;
  focusOnTouch?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog)
      dialog.dataset.animation =
        dialog.closest("[data-input]")?.getAttribute("data-input") ??
        "keyboard";
    dialog?.setAttribute("autofocus", "");
    dialog?.showModal();
    if (focusOnTouch || window.matchMedia("(min-width: 821px)").matches) {
      dialog
        ?.querySelector<HTMLElement>(
          initialFocus ??
            'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)',
        )
        ?.focus();
    } else {
      // Keep the phone keyboard closed until the user chooses a field.
      dialog?.focus();
    }
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [initialFocus, focusOnTouch]);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        (escape ?? close)();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          (escape ?? close)();
        }
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
