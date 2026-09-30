"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import s from "./App.module.css";
export interface ToastMessage {
  id: number;
  text: string;
  undo?: () => Promise<void>;
}
export function Toast({
  message,
  dismiss,
  undo,
}: {
  message: ToastMessage | null;
  dismiss: () => void;
  undo: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const toast = ref.current;
    if (toast)
      toast.dataset.animation =
        toast.closest("[data-input]")?.getAttribute("data-input") ?? "keyboard";
  }, [message?.id]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, dismiss]);
  return message ? (
    <div key={message.id} ref={ref} className={s.toast} role="status">
      <span>{message.text}</span>
      {message.undo && <button onClick={undo}>Undo</button>}
    </div>
  ) : null;
}
