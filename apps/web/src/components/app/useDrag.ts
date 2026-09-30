"use client";
import { useEffect, useRef, type PointerEvent, type MouseEvent } from "react";
import { layout, minutesOf, timeOf, formatMinutes } from "@kriyan/core";
import type { Task } from "./types";
import type { TaskPatch } from "@kriyan/backend/convex/validators";
import s from "./App.module.css";
interface Drag {
  task: Task;
  element: HTMLElement;
  grid: HTMLElement;
  mode: string;
  x: number;
  y: number;
  offset: number;
  active: boolean;
  minute: number | null;
  duration: number | null;
  ghost?: HTMLElement;
  marker?: HTMLElement;
  oldStyle: string;
}
export function useDrag(
  tasks: Task[],
  date: string,
  startHour: number,
  endHour: number,
  write: (task: Task, patch: TaskPatch, message: string) => void,
) {
  const drag = useRef<Drag | null>(null);
  const suppress = useRef(false);
  useEffect(() => {
    const toMinute = (y: number, grid: HTMLElement) =>
      Math.max(
        startHour * 60,
        Math.min(
          endHour * 60,
          Math.round(
            (startHour * 60 +
              ((y - grid.getBoundingClientRect().top) / layout.hourHeight) *
                60) /
              15,
          ) * 15,
        ),
      );
    const move = (event: globalThis.PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      if (!current.active) {
        if (
          Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5
        )
          return;
        current.active = true;
        current.element.classList.add(s.drag);
        if (current.mode === "place") {
          current.ghost = document.createElement("div");
          current.ghost.className = s.ghost;
          current.ghost.textContent = current.task.title;
          current.grid.appendChild(current.ghost);
          current.marker = document.createElement("div");
          current.marker.className = s.drop;
          current.grid.appendChild(current.marker);
          current.element.style.opacity = "0.4";
        }
      }
      if (current.mode === "resize") {
        current.duration = Math.max(
          15,
          toMinute(event.clientY, current.grid) -
            minutesOf(current.task.time ?? "00:00"),
        );
        current.element.style.height = `${Math.max((current.duration / 60) * layout.hourHeight - 3, 30)}px`;
        current.element.classList.remove(s.pt);
      } else if (current.mode === "move") {
        current.minute = Math.min(
          toMinute(event.clientY - current.offset, current.grid),
          endHour * 60 - (current.task.durationMinutes ?? 15),
        );
        current.minute = Math.max(startHour * 60, current.minute);
        current.element.style.top = `${((current.minute - startHour * 60) / 60) * layout.hourHeight + 1}px`;
      } else {
        const rect = current.grid.getBoundingClientRect();
        const dayRect =
          current.grid.closest("[data-day-scroll]")?.getBoundingClientRect() ??
          rect;
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= Math.max(rect.top, dayRect.top) &&
          event.clientY <= Math.min(rect.bottom, dayRect.bottom);
        current.minute = inside
          ? Math.min(toMinute(event.clientY, current.grid), endHour * 60 - 15)
          : null;
        if (current.ghost) {
          current.ghost.style.left = `${event.clientX + 12}px`;
          current.ghost.style.top = `${event.clientY + 8}px`;
        }
        if (current.marker) {
          current.marker.hidden = !inside;
          current.marker.style.top = `${(((current.minute ?? 0) - startHour * 60) / 60) * layout.hourHeight + 1}px`;
          current.marker.style.height = `${Math.max(((current.task.durationMinutes ?? 30) / 60) * layout.hourHeight - 3, 30)}px`;
          current.marker.textContent = timeOf(current.minute ?? 0);
        }
      }
      const time = current.element.querySelector("time");
      if (time && current.mode !== "place") {
        const minute =
            current.minute ?? minutesOf(current.task.time ?? "00:00"),
          duration = current.duration ?? current.task.durationMinutes;
        time.textContent = `${timeOf(minute)}${duration === null ? "" : ` to ${timeOf(minute + duration)}`}`;
      }
    };
    const finish = (cancelled: boolean) => {
      const current = drag.current;
      drag.current = null;
      if (!current) return;
      current.ghost?.remove();
      current.marker?.remove();
      current.element.classList.remove(s.drag);
      current.element.setAttribute("style", current.oldStyle);
      if (current.task.durationMinutes === null)
        current.element.classList.add(s.pt);
      const time = current.element.querySelector("time");
      if (time) time.textContent = current.task.time ?? "";
      if (!current.active) return;
      suppress.current = true;
      setTimeout(() => {
        suppress.current = false;
      }, 0);
      if (cancelled) return;
      if (current.mode === "resize" && current.duration !== null)
        write(
          current.task,
          { durationMinutes: current.duration },
          `Length set to ${formatMinutes(current.duration)}`,
        );
      else if (current.minute !== null)
        write(
          current.task,
          { date, time: timeOf(current.minute) },
          `Scheduled for ${timeOf(current.minute)}`,
        );
    };
    const up = () => finish(false),
      cancel = () => finish(true);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      finish(true);
    };
  }, [date, startHour, endHour, write]);
  return {
    onPointerDown(event: PointerEvent) {
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        !(event.target instanceof HTMLElement) ||
        event.target.closest("button, input, select, textarea")
      )
        return;
      const element = event.target.closest<HTMLElement>("[data-drag]"),
        grid =
          event.currentTarget.querySelector<HTMLElement>("[data-timeline]");
      const task = tasks.find((task) => task._id === element?.dataset.task);
      if (!element || !grid || !task) return;
      drag.current = {
        task,
        element,
        grid,
        mode: event.target.closest("[data-resize]")
          ? "resize"
          : (element.dataset.drag ?? "place"),
        x: event.clientX,
        y: event.clientY,
        offset: event.clientY - element.getBoundingClientRect().top,
        active: false,
        minute: null,
        duration: null,
        oldStyle: element.getAttribute("style") ?? "",
      };
      element.focus();
      event.preventDefault();
    },
    onClickCapture(event: MouseEvent) {
      if (suppress.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
