"use client";

import { ArrowLeft, Check, X } from "@phosphor-icons/react";
import DOMPurify from "dompurify";
import { useRef, useState } from "react";
import type { Region, Task, TaskPatch } from "@/lib/types";
import styles from "./kriyan.module.css";

function niceDate(date: string | null) {
  if (!date) return "a date";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function TaskEditor({ task, regions, onBack, onUpdate, onComplete }: { task: Task; regions: Region[]; onBack: () => void; onUpdate: (id: string, patch: TaskPatch) => Promise<void>; onComplete: (id: string, completed: boolean) => Promise<void> }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [reminders, setReminders] = useState(task.reminders.join(", "));
  const [duration, setDuration] = useState(task.durationMinutes ? String(task.durationMinutes) : "");
  const editorRef = useRef<HTMLDivElement>(null);
  const region = regions.find((item) => item.id === task.regionId);

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
  }

  function insertChildPage() {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, '<p><a href="#child-page">Untitled page</a></p>');
  }

  return (
    <main className={styles.editorPage}>
      <div className={styles.editorCrumbs}>
        <button type="button" onClick={onBack}><ArrowLeft size={16} weight="thin" /> garden</button>
        <span>/</span><span>{region?.name ?? "Unsorted"}</span><span>/</span><span>this page</span>
      </div>
      <article className={styles.editorArticle}>
        <input
          className={styles.taskTitleInput}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => { if (title.trim() && title.trim() !== task.title) void onUpdate(task.id, { title: title.trim() }); }}
          aria-label="Task title"
        />
        <div className={styles.taskMetaLine}>
          <button type="button" onClick={() => setDetailsOpen(true)}><span style={{ background: region?.color ?? "#8e8a7d" }} />{region?.name ?? "place"}</button>
          <i>·</i>
          <button type="button" onClick={() => setDetailsOpen(true)}>{niceDate(task.dueDate)}</button>
          <i>·</i>
          <button type="button" onClick={() => setDetailsOpen(true)}>{task.durationMinutes ? `${task.durationMinutes} min` : "how long"}</button>
          <i>·</i>
          <button type="button" onClick={() => setDetailsOpen(true)}>{task.repeatRule ?? "repeat"}</button>
          <i>·</i>
          <button type="button" onClick={() => setDetailsOpen(true)}>{task.reminders.length ? `${task.reminders.length} remind${task.reminders.length > 1 ? "s" : ""}` : "remind"}</button>
        </div>

        {task.reminders.length > 0 ? (
          <div className={styles.reminderTimes}>
            {task.reminders.map((reminder) => <span key={reminder}>{reminder}</span>)}
          </div>
        ) : null}

        <div className={styles.editorToolbar} role="toolbar" aria-label="Writing tools">
          <button type="button" onMouseDown={(event) => { event.preventDefault(); command("formatBlock", "p"); }}>text</button>
          <button type="button" onMouseDown={(event) => { event.preventDefault(); command("formatBlock", "h2"); }}>heading</button>
          <button type="button" onMouseDown={(event) => { event.preventDefault(); command("insertUnorderedList"); }}>list</button>
          <button type="button" onMouseDown={(event) => { event.preventDefault(); insertChildPage(); }}>page inside</button>
        </div>

        <div
          ref={editorRef}
          className={styles.writingSurface}
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.content) }}
          data-placeholder="Write into the quiet..."
          onBlur={(event) => {
            const content = DOMPurify.sanitize(event.currentTarget.innerHTML);
            if (content !== task.content) void onUpdate(task.id, { content });
          }}
        />

        <button className={styles.completeButton} type="button" onClick={() => void onComplete(task.id, task.status !== "completed")}>
          <Check size={18} weight="thin" /> {task.status === "completed" ? "return to the bed" : "lift from the bed"}
        </button>
      </article>

      {detailsOpen ? (
        <aside className={styles.detailsPanel} aria-label="Task details">
          <div className={styles.panelTop}><span>task details</span><button type="button" aria-label="Close details" onClick={() => setDetailsOpen(false)}><X size={17} weight="thin" /></button></div>
          <label><span>place</span><select value={region ? region.id : ""} onChange={(event) => void onUpdate(task.id, { regionId: event.target.value || null })}><option value="">unsorted</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>due date</span><input type="date" value={task.dueDate ?? ""} onInput={(event) => { const value = event.currentTarget.value; void onUpdate(task.id, { dueDate: value || null }); }} /></label>
          <label><span>time</span><input type="time" value={task.time ?? ""} onChange={(event) => void onUpdate(task.id, { time: event.target.value || null })} /></label>
          <label><span>duration</span><input inputMode="numeric" placeholder="minutes" value={duration} onChange={(event) => setDuration(event.target.value.replace(/\D/g, ""))} onBlur={() => { const next = duration ? Number(duration) : null; if (next !== task.durationMinutes) void onUpdate(task.id, { durationMinutes: next }); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
          <label><span>repeat</span><select value={task.repeatRule ?? ""} onChange={(event) => void onUpdate(task.id, { repeatRule: event.target.value || null })}><option value="">does not repeat</option><option value="every day">every day</option><option value="every weekday">every weekday</option><option value="every week">every week</option><option value="every Monday, Wednesday, Friday">Monday, Wednesday, Friday</option><option value="every month">every month</option><option value="every year">every year</option>{task.repeatRule && !["every day", "every weekday", "every week", "every Monday, Wednesday, Friday", "every month", "every year"].includes(task.repeatRule) ? <option value={task.repeatRule}>{task.repeatRule}</option> : null}</select></label>
          <label><span>reminders</span><input placeholder="08:00, Friday 18:00" value={reminders} onChange={(event) => setReminders(event.target.value)} onBlur={() => { const next = reminders.split(",").map((item) => item.trim()).filter(Boolean); if (next.join("\n") !== task.reminders.join("\n")) void onUpdate(task.id, { reminders: next }); }} /></label>
          <p>Reminders ring through the Android app. Each time stays with every occurrence.</p>
        </aside>
      ) : null}
    </main>
  );
}
