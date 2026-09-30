"use client";
import { useLayoutEffect, useRef, type ComponentProps } from "react";

export function AutoTextarea(props: ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    resize();
    const field = ref.current;
    let width = field?.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field?.clientWidth !== width) {
        width = field?.clientWidth;
        resize();
      }
    });
    if (field) observer.observe(field);
    let mounted = true;
    void document.fonts?.ready.then(() => {
      if (mounted) resize();
    });
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, []);
  return <textarea {...props} ref={ref} rows={1} onInput={resize} />;
}
