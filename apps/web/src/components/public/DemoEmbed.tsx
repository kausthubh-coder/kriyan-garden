"use client";
import { useEffect, useRef, useState } from "react";
import s from "./Public.module.css";
/** Reserve the frame before loading the app, after the hero has painted. */
export function DemoEmbed({phone = false}: {phone?: boolean}) {
  const frame = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let first = 0, second = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      first = requestAnimationFrame(() => { second = requestAnimationFrame(() => { timer = setTimeout(() => setReady(true), 1500); }); });
    });
    if (frame.current) observer.observe(frame.current);
    return () => {observer.disconnect(); cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(timer);};
  }, []);
  return <div ref={frame} className={phone ? s.phoneEmbed : s.demo}>{ready && <iframe src="/demo?embed=landing" title={phone ? "Kriyan phone demo with sample tasks" : "Interactive Kriyan demo with sample tasks"} loading="lazy" />}</div>;
}
