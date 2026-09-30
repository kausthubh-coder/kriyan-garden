"use client";
import type { ComponentProps } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { TaskPanel } from "./TaskPanel";
import type { Task } from "./types";
import s from "./App.module.css";

export function TaskSelectionPanel({ task, ...props }: Omit<ComponentProps<typeof TaskPanel>, "task"> & { task: Task | null | undefined }) {
  if (task) return <TaskPanel task={task} {...props} />;
  return <Dialog label="Task details" className={s.panel} close={props.close} initialFocus="button">
    <div className={s.ph}>
      {task === null ? "Task unavailable" : "Loading task"}
      <button onClick={props.close} aria-label="Close task details"><Icon name="close" /></button>
    </div>
    <div className={s.empty} role={task === null ? "alert" : "status"}>
      {task === null ? "This task is unavailable. It may have been deleted or the link may be incorrect. Close its details and choose another task." : "Loading task details."}
    </div>
  </Dialog>;
}
