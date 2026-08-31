"use client";

import { BellSimple, X } from "@phosphor-icons/react";
import type { Region, Task } from "@/lib/types";
import styles from "./kriyan.module.css";

export function ReminderPanel({ tasks, regions, onClose, onOpen }: { tasks: Task[]; regions: Region[]; onClose: () => void; onOpen: (id: string) => void }) {
  const reminded = tasks.filter((task) => task.status === "active" && task.reminders.length > 0);
  const regionMap = new Map(regions.map((region) => [region.id, region]));
  return (
    <aside className={styles.remindPanel}>
      <div className={styles.panelTop}><span><BellSimple size={16} weight="thin" /> reminders</span><button type="button" onClick={onClose} aria-label="Close reminders"><X size={17} weight="thin" /></button></div>
      <p className={styles.remindIntro}>A few quiet knocks, when you asked for them.</p>
      <div className={styles.remindList}>
        {reminded.map((task) => (
          <button type="button" key={task.id} onClick={() => onOpen(task.id)}>
            <i style={{ background: task.regionId ? regionMap.get(task.regionId)?.color : "#8e8a7d" }} />
            <span><strong>{task.title}</strong><small>{task.reminders.join(" · ")}</small></span>
          </button>
        ))}
      </div>
    </aside>
  );
}
