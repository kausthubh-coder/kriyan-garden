"use client";

import { ArrowRight, Plus, X } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import styles from "./kriyan.module.css";

const suggestions = ["School", "Coding", "Personal", "Health", "Home"];

export function Onboarding({ onComplete, onDemo }: { onComplete: (names: string[]) => Promise<void>; onDemo: () => Promise<void> }) {
  const [spaces, setSpaces] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addSpace(value: string) {
    const name = value.trim();
    if (!name || spaces.some((space) => space.toLowerCase() === name.toLowerCase())) return;
    setSpaces((current) => [...current, name].slice(0, 8));
    setDraft("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim() ? [...spaces, draft.trim()] : spaces;
    if (next.length === 0) {
      setError("Name at least one space.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onComplete(next);
    } catch {
      setError("Your garden could not be created.");
      setSaving(false);
    }
  }

  async function openDemo() {
    setSaving(true);
    setError("");
    try {
      await onDemo();
    } catch {
      setError("The demo garden could not be opened.");
      setSaving(false);
    }
  }

  return (
    <main className={styles.onboarding}>
      <div className={styles.onboardingMark}><span />kriyan</div>
      <section className={styles.onboardingCard}>
        <p className={styles.onboardingKicker}>your garden begins here</p>
        <h1>What parts of life are you tending?</h1>
        <p className={styles.onboardingIntro}>Make a few spaces for the work you want to keep close. You can rename, add, or remove them later.</p>

        <div className={styles.suggestions} aria-label="Suggested spaces">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" disabled={spaces.includes(suggestion)} onClick={() => addSpace(suggestion)}>
              <Plus size={14} weight="thin" /> {suggestion}
            </button>
          ))}
        </div>

        <form className={styles.spaceStarter} onSubmit={submit}>
          <label htmlFor="first-space">name a space</label>
          <div>
            <input id="first-space" autoFocus maxLength={48} placeholder="School, coding, health..." value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="button" aria-label="Add space" disabled={!draft.trim()} onClick={() => addSpace(draft)}><Plus size={18} weight="thin" /></button>
          </div>

          {spaces.length > 0 ? (
            <div className={styles.chosenSpaces} aria-label="Your spaces">
              {spaces.map((space, index) => (
                <span key={space} style={{ "--space-color": ["#637b54", "#bb6546", "#c5a04f", "#8a7c6c", "#6f7784"][index % 5] } as React.CSSProperties}>
                  <i />{space}<button type="button" aria-label={`Remove ${space}`} onClick={() => setSpaces((current) => current.filter((item) => item !== space))}><X size={13} /></button>
                </span>
              ))}
            </div>
          ) : null}

          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <button className={styles.enterGarden} type="submit" disabled={saving || (spaces.length === 0 && !draft.trim())}>
            {saving ? "making room" : "enter your garden"}<ArrowRight size={18} weight="thin" />
          </button>
        </form>

        <button className={styles.demoLink} type="button" disabled={saving} onClick={() => void openDemo()}>or explore the sample garden</button>
      </section>
    </main>
  );
}
