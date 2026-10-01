"use client";
import type { Doc } from "@kriyan/backend/convex/_generated/dataModel";
import { Dialog } from "./Dialog";
import { GoalForm, type GoalDraft } from "./GoalForm";
import type { Area } from "./types";
import s from "./App.module.css";

export function GoalDialog({ areas, today, draft, close, saved }: {
  areas: Area[]; today: string; draft?: GoalDraft; close: () => void;
  saved: (goal: Doc<"goals">) => void;
}) {
  return <Dialog label="Add goal" className={s.goalDialog} close={close}
    initialFocus='input[name="title"]' focusOnTouch>
    <GoalForm areas={areas} today={today} draft={draft} close={close} saved={saved} />
  </Dialog>;
}
