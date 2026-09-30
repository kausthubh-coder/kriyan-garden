"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import {
  areaColor,
  relativeDate,
  type Area,
  type Task,
  type View,
  type Variables,
} from "./types";
import s from "./App.module.css";
export function CommandPalette({
  tasks,
  areas,
  today,
  close,
  add,
  navigate,
  goToday,
  filter,
  help,
  open,
}: {
  tasks: Task[];
  areas: Area[];
  today: string;
  close: () => void;
  add: (text?: string) => void;
  navigate: (view: View) => void;
  goToday: () => void;
  filter: (value: string) => void;
  help: () => void;
  open: (task: Task) => void;
}) {
  const [query, setQuery] = useState(""),
    [index, setIndex] = useState(0);
  const list = useRef<HTMLUListElement>(null),
    q = query.trim().toLowerCase();
  const commands: {
    label: string;
    shortcut?: string;
    color?: string;
    run: () => void;
  }[] = [
    { label: "Add a task", shortcut: "N", run: () => add() },
    ...(["day", "list", "week", "goals"] as const).map((view, i) => ({
      label: `Go to ${view[0].toUpperCase()}${view.slice(1)}`,
      shortcut: String(i + 1),
      run: () => navigate(view),
    })),
    { label: "Jump to today", shortcut: "T", run: goToday },
    { label: "Show all areas", run: () => filter("all") },
    ...areas.map((area) => ({
      label: `Show only ${area.name}`,
      color: areaColor(area),
      run: () => filter(area._id),
    })),
    { label: "Keyboard shortcuts", shortcut: "?", run: help },
  ];
  const matches = q
    ? tasks
        .filter((task) => task.title.toLowerCase().includes(q))
        .slice(0, 8)
        .map((task) => ({
          label: task.title,
          color: areaColor(areas.find((area) => area._id === task.areaId)),
          shortcut: task.date ? relativeDate(task.date, today) : "No date",
          run: () => open(task),
        }))
    : [];
  const items = [
    ...matches,
    ...commands.filter(
      (command) => !q || command.label.toLowerCase().includes(q),
    ),
  ];
  if (!items.length)
    items.push({
      label: `Add "${query.trim()}" as a task`,
      run: () => add(query.trim()),
    });
  const selected = Math.min(index, items.length - 1);
  const run = (i: number) => {
    close();
    items[i]?.run();
  };
  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <Dialog
      label="Search and commands"
      className={s.pal}
      close={close}
      initialFocus="input"
    >
      <input
        aria-label="Search"
        role="combobox"
        aria-expanded="true"
        aria-controls="command-list"
        aria-activedescendant={`command-${selected}`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
        }}
        placeholder="Search tasks or run a command"
        autoComplete="off"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIndex(
              Math.max(
                0,
                Math.min(
                  selected + (event.key === "ArrowDown" ? 1 : -1),
                  items.length - 1,
                ),
              ),
            );
          }
          if (event.key === "Enter") {
            event.preventDefault();
            run(selected);
          }
        }}
      />
      <ul
        id="command-list"
        role="listbox"
        aria-label="Tasks and commands"
        ref={list}
      >
        {items.map((item, i) => (
          <li
            id={`command-${i}`}
            key={item.label}
            role="option"
            aria-selected={i === selected}
            className={i === selected ? s.on : undefined}
          >
            <button tabIndex={-1} onClick={() => run(i)}>
              {item.color && (
                <i
                  className={s.dot}
                  style={{ "--c": item.color } as Variables}
                />
              )}
              {item.label}
              {item.shortcut && <small>{item.shortcut}</small>}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
