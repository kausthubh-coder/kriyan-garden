"use client";

import { ArrowRight, Plus, X } from "@phosphor-icons/react";
import DOMPurify from "dompurify";
import { useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Region, TaskDraft } from "@/lib/types";
import styles from "./kriyan.module.css";

type RepeatUnit = "" | "day" | "week" | "month" | "year";
type RepeatEnd = "never" | "date" | "count";
type ReminderKind = "occurrence" | "once";
type SlashCommand = "text" | "heading" | "bullets" | "numbered" | "table" | "page";

type ReminderDraft = {
  id: string;
  kind: ReminderKind;
  value: string;
};

const weekdays = [
  { id: "mon", short: "M", name: "Monday" },
  { id: "tue", short: "T", name: "Tuesday" },
  { id: "wed", short: "W", name: "Wednesday" },
  { id: "thu", short: "T", name: "Thursday" },
  { id: "fri", short: "F", name: "Friday" },
  { id: "sat", short: "S", name: "Saturday" },
  { id: "sun", short: "S", name: "Sunday" },
];

function repeatLabel(unit: RepeatUnit, interval: number, days: string[], end: RepeatEnd, endDate: string, endCount: string) {
  if (!unit) return "Does not repeat";
  const amount = Math.max(1, interval);
  const unitLabel = amount === 1 ? unit : `${unit}s`;
  let label = amount === 1 ? `Every ${unitLabel}` : `Every ${amount} ${unitLabel}`;
  if (unit === "week" && days.length > 0) {
    const names = weekdays.filter((day) => days.includes(day.id)).map((day) => day.name);
    label += ` on ${names.join(", ")}`;
  }
  if (end === "date" && endDate) label += ` until ${endDate}`;
  else if (end === "count" && Number(endCount) > 0) label += ` for ${Number(endCount)} occurrences`;
  else label += ", forever";
  return label;
}

export function PlantComposer({ regions, initialDate, initialRegionId, onCancel, onPlant }: { regions: Region[]; initialDate?: string | null; initialRegionId?: string | null; onCancel: () => void; onPlant: (draft: TaskDraft) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [regionId, setRegionId] = useState(initialRegionId ?? regions[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(initialDate ?? "");
  const [duration, setDuration] = useState("");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [repeatEnd, setRepeatEnd] = useState<RepeatEnd>("never");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [repeatCount, setRepeatCount] = useState("10");
  const [reminders, setReminders] = useState<ReminderDraft[]>([]);
  const [slashOpen, setSlashOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedRegion = regions.find((region) => region.id === regionId);
  const rule = repeatLabel(repeatUnit, repeatInterval, repeatDays, repeatEnd, repeatEndDate, repeatCount);

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
  }

  function insertChildPage() {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, '<p><a href="#child-page">Untitled page</a></p>');
  }

  function insertTable() {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, "<table><tbody><tr><td>Column</td><td>Column</td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>");
  }

  function applySlashCommand(next: SlashCommand) {
    editorRef.current?.focus();
    document.execCommand("delete");
    if (next === "text") command("formatBlock", "p");
    if (next === "heading") command("formatBlock", "h2");
    if (next === "bullets") command("insertUnorderedList");
    if (next === "numbered") command("insertOrderedList");
    if (next === "table") insertTable();
    if (next === "page") insertChildPage();
    setSlashOpen(false);
  }

  function toggleDay(day: string) {
    setRepeatDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  function addReminder() {
    setReminders((current) => [...current, {
      id: crypto.randomUUID(),
      kind: repeatUnit ? "occurrence" : "once",
      value: "",
    }]);
  }

  function updateReminder(id: string, patch: Partial<ReminderDraft>) {
    setReminders((current) => current.map((reminder) => reminder.id === id ? { ...reminder, ...patch } : reminder));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const reminderValues = reminders.flatMap((reminder) => {
        if (!reminder.value) return [];
        return [reminder.kind === "occurrence" ? `each occurrence at ${reminder.value}` : `once on ${reminder.value}`];
      });
      await onPlant({
        title: title.trim(),
        regionId: regionId || null,
        dueDate: dueDate || null,
        durationMinutes: duration ? Number(duration) : null,
        repeatRule: repeatUnit ? rule : null,
        reminders: reminderValues,
        content: DOMPurify.sanitize(editorRef.current?.innerHTML || "<p></p>"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.composer}>
      <button className={styles.crumbButton} type="button" onClick={onCancel}>garden / new todo</button>
      <form className={styles.composerBody} onSubmit={submit}>
        <div className={styles.composerTitleRow}>
          <span style={{ background: selectedRegion?.color ?? "#637b54" }} />
          <input autoFocus aria-label="Task title" placeholder="What needs doing?" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className={styles.composerBasics}>
          <label className={styles.placeField} style={{ "--place-color": selectedRegion?.color ?? "#637b54" } as CSSProperties}>
            <span>place</span>
            <div><i aria-hidden="true" /><select aria-label="Place" value={regionId} onChange={(event) => setRegionId(event.target.value)}>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></div>
          </label>
          <label><span>due date</span><input aria-label="Due date" type="date" value={dueDate} onInput={(event) => setDueDate(event.currentTarget.value)} /></label>
          <label><span>duration</span><div className={styles.durationField}><input aria-label="Duration in minutes" inputMode="numeric" placeholder="45" value={duration} onChange={(event) => setDuration(event.target.value.replace(/\D/g, ""))} /><em>min</em></div></label>
        </div>

        <div className={styles.scheduleBuilder}>
          <section className={styles.scheduleGroup} aria-labelledby="repeat-heading">
            <h2 id="repeat-heading">repeat</h2>
            <div className={`${styles.repeatTopline} ${!repeatUnit ? styles.repeatToplineIdle : ""}`}>
              {repeatUnit ? <label><span>every</span><input aria-label="Repeat interval" type="number" min="1" max="99" value={repeatInterval} onChange={(event) => setRepeatInterval(Math.max(1, Number(event.target.value) || 1))} /></label> : null}
              <select aria-label="Repeat unit" value={repeatUnit} onChange={(event) => { setRepeatUnit(event.target.value as RepeatUnit); if (!event.target.value) setRepeatDays([]); }}>
                <option value="">does not repeat</option>
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </div>
            {repeatUnit === "week" ? (
              <div className={styles.weekdayPicker}>
                <span>on</span>
                {weekdays.map((day) => <button key={day.id} type="button" title={day.name} aria-label={day.name} aria-pressed={repeatDays.includes(day.id)} onClick={() => toggleDay(day.id)}>{day.short}</button>)}
              </div>
            ) : null}
            {repeatUnit ? (
              <div className={styles.repeatEndRow}>
                <label><span>ends</span><select aria-label="Repeat ends" value={repeatEnd} onChange={(event) => setRepeatEnd(event.target.value as RepeatEnd)}><option value="never">never</option><option value="date">on a date</option><option value="count">after a number</option></select></label>
                {repeatEnd === "date" ? <input aria-label="Repeat end date" type="date" value={repeatEndDate} onInput={(event) => setRepeatEndDate(event.currentTarget.value)} /> : null}
                {repeatEnd === "count" ? <div className={styles.occurrenceField}><input aria-label="Number of occurrences" type="number" min="1" max="999" value={repeatCount} onChange={(event) => setRepeatCount(event.target.value)} /><span>occurrences</span></div> : null}
              </div>
            ) : null}
            <p className={styles.ruleSummary}>{rule}</p>
          </section>

          <section className={styles.scheduleGroup} aria-labelledby="reminders-heading">
            <h2 id="reminders-heading">reminders</h2>
            <p className={styles.scheduleHelp}>Use a time for every occurrence, or choose one exact date and time.</p>
            <div className={styles.reminderRows}>
              {reminders.map((reminder, index) => (
                <div className={styles.reminderRow} key={reminder.id}>
                  <select aria-label={`Reminder ${index + 1} type`} value={reminder.kind} onChange={(event) => updateReminder(reminder.id, { kind: event.target.value as ReminderKind, value: "" })}>
                    <option value="occurrence">each occurrence</option>
                    <option value="once">one time</option>
                  </select>
                  <input aria-label={`Reminder ${index + 1} ${reminder.kind === "occurrence" ? "time" : "date and time"}`} type={reminder.kind === "occurrence" ? "time" : "datetime-local"} value={reminder.value} onInput={(event) => updateReminder(reminder.id, { value: event.currentTarget.value })} />
                  <button type="button" aria-label={`Remove reminder ${index + 1}`} onClick={() => setReminders((current) => current.filter((item) => item.id !== reminder.id))}><X size={15} weight="thin" /></button>
                </div>
              ))}
            </div>
            <button className={styles.addReminderButton} type="button" onClick={addReminder}><Plus size={15} weight="thin" />add reminder</button>
          </section>
        </div>

        <section className={styles.composerNotes} aria-labelledby="notes-heading">
          <div className={styles.notesLabel} id="notes-heading">notes</div>
          <div ref={editorRef} className={`${styles.writingSurface} ${styles.composerWritingSurface}`} contentEditable suppressContentEditableWarning role="textbox" aria-label="Task notes" aria-multiline="true" data-placeholder="Write notes. Type '/' for blocks." onInput={(event) => setSlashOpen((event.currentTarget.textContent ?? "").endsWith("/"))} onKeyDown={(event) => { if (event.key === "Escape") setSlashOpen(false); }} />
          {slashOpen ? (
            <div className={styles.slashMenu} role="menu" aria-label="Insert a note block">
              {([
                ["text", "Text", "Plain paragraph"],
                ["heading", "Heading", "Section title"],
                ["bullets", "Bulleted list", "Simple list"],
                ["numbered", "Numbered list", "Ordered steps"],
                ["table", "Table", "Rows and columns"],
                ["page", "Page", "A page inside this note"],
              ] as Array<[SlashCommand, string, string]>).map(([id, label, detail]) => (
                <button key={id} type="button" role="menuitem" onMouseDown={(event) => { event.preventDefault(); applySlashCommand(id); }}><strong>{label}</strong><span>{detail}</span></button>
              ))}
            </div>
          ) : null}
        </section>

        <button className={styles.enterTask} type="submit" disabled={!title.trim() || saving}>
          {saving ? "creating" : "create todo"}<ArrowRight size={17} weight="regular" />
        </button>
      </form>
    </main>
  );
}
