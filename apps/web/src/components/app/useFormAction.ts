"use client";
import { useRef, useState } from "react";
export function useFormAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  async function run(
    action: () => Promise<unknown>,
    success = "Changes saved.",
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      return true;
    } catch (failure) {
      setError(
        `${failure instanceof Error ? failure.message : "The change could not be saved."} Check the fields and try again.`,
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, run };
}
