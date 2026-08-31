"use client";

import { Plus, Trash, X } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import type { Region } from "@/lib/types";
import styles from "./kriyan.module.css";

function SpaceRow({ region, taskCount, canDelete, onRename, onDelete }: { region: Region; taskCount: number; canDelete: boolean; onRename: (id: string, name: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [name, setName] = useState(region.name);
  const [saving, setSaving] = useState(false);

  async function saveName() {
    const next = name.trim();
    if (!next) {
      setName(region.name);
      return;
    }
    if (next === region.name) return;
    setSaving(true);
    try {
      await onRename(region.id, next);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const detail = taskCount > 0 ? ` ${taskCount} todo${taskCount === 1 ? "" : "s"} will move to Unsorted.` : "";
    if (!window.confirm(`Remove ${region.name}?${detail}`)) return;
    setSaving(true);
    try {
      await onDelete(region.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.spaceRow}>
      <span style={{ background: region.color }} />
      <label>
        <span>space name</span>
        <input value={name} maxLength={48} onChange={(event) => setName(event.target.value)} onBlur={() => void saveName()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <small>{taskCount} todo{taskCount === 1 ? "" : "s"}</small>
      </label>
      <button type="button" disabled={!canDelete || saving} aria-label={`Remove ${region.name}`} title={canDelete ? `Remove ${region.name}` : "Keep at least one space"} onClick={() => void remove()}><Trash size={17} weight="thin" /></button>
    </div>
  );
}

export function SpacesPanel({ regions, taskCounts, onClose, onCreate, onRename, onDelete, onReset }: { regions: Region[]; taskCounts: Map<string, number>; onClose: () => void; onCreate: (name: string) => Promise<void>; onRename: (id: string, name: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onReset: () => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await onCreate(name);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className={styles.spacesPanel} aria-label="Manage spaces">
      <div className={styles.panelTop}><span>your spaces</span><button type="button" aria-label="Close spaces" onClick={onClose}><X size={17} weight="thin" /></button></div>
      <p className={styles.spacesIntro}>Give each part of life a place. Names can change whenever the work does.</p>
      <div className={styles.spaceRows}>
        {regions.map((region) => <SpaceRow key={region.id} region={region} taskCount={taskCounts.get(region.id) ?? 0} canDelete={regions.length > 1} onRename={onRename} onDelete={onDelete} />)}
      </div>
      <form className={styles.addSpaceForm} onSubmit={submit}>
        <input aria-label="New space name" maxLength={48} placeholder="another space" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" disabled={!draft.trim() || saving}><Plus size={16} weight="thin" />add space</button>
      </form>
      <button className={styles.startOverButton} type="button" onClick={() => {
        if (window.confirm("Start onboarding again? This clears the prototype's local todos and spaces.")) void onReset();
      }}>start onboarding again</button>
    </aside>
  );
}
