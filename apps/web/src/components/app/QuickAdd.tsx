"use client";
import { relativeDay } from "@kriyan/core";
import { useState } from "react";
import {
  parse,
  formatMinutes,
  type QuickAddContext,
  type QuickAddResult,
} from "@kriyan/core";
import { Dialog } from "./Dialog";
import { areaColor, type Area, type Project, type Variables } from "./types";
import s from "./App.module.css";
export function QuickAdd({
  context,
  areas,
  projects,
  initialText = "",
  close,
  submit,
}: {
  context: QuickAddContext;
  areas: Area[];
  projects: Project[];
  initialText?: string;
  close: () => void;
  submit: (result: QuickAddResult) => void;
}) {
  const [input, setInput] = useState(initialText);
  const parsed = parse(input, context),
    area = areas.find((area) => area._id === parsed.areaId),
    project = projects.find((project) => project._id === parsed.projectId);
  return (
    <Dialog
      label="Add a task"
      className={s.qa}
      close={close}
      initialFocus="input"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed.title && area) submit(parsed);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="econ outline fri 5pm #econ 45m"
          aria-label="Task"
        />
        <div className={s.chips} aria-live="polite">
          {!input.trim() ? (
            <>
              <span className={`${s.chip} ${s.off}`}>
                Try: gym tomorrow 7am
              </span>
              <span className={`${s.chip} ${s.off}`}>call amma</span>
              <span className={`${s.chip} ${s.off}`}>essay fri #econ 2h</span>
            </>
          ) : (
            <>
              <span
                className={s.chip}
                style={{ "--c": areaColor(area) } as Variables}
              >
                <i className={s.dot} />
                {area?.name ?? "Choose an area"}
                {project && <small>{project.name}</small>}
              </span>
              <span className={s.chip}>
                {parsed.date
                  ? relativeDay(parsed.date, context.today)
                  : "No date yet"}
              </span>
              <span className={`${s.chip} ${parsed.time ? "" : s.off}`}>
                {parsed.time ?? "Any time"}
              </span>
              <span
                className={`${s.chip} ${parsed.durationMinutes ? "" : s.off}`}
              >
                {parsed.durationMinutes === null
                  ? "No length"
                  : formatMinutes(parsed.durationMinutes)}
              </span>
            </>
          )}
        </div>
        <div className={s["qa-foot"]}>
          <span>Type a day, a time, a length or a #tag. All optional.</span>
          <button className={s.btn} disabled={!parsed.title || !area}>
            Add task
          </button>
        </div>
      </form>
    </Dialog>
  );
}
