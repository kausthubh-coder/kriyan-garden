"use client";
import { useEffect } from "react";
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
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, dismiss]);
  return message ? (
    <div className={s.toast} role="status">
      <span>{message.text}</span>
      {message.undo && <button onClick={undo}>Undo</button>}
    </div>
  ) : null;
}
