import { layoutIntervals, minutesOf, timeOf, timeValue } from "@kriyan/core";
import { TimelineBlock, type Block } from "./TimelineBlock";
import type { Area, Day, Goal, Project, PanelSection, Task } from "./types";
import s from "./App.module.css";
export function Timeline({
  day,
  startHour,
  endHour,
  date,
  today,
  now,
  areas,
  projects,
  goals,
  open,
  toggle,
  loading,
  static: isStatic = false,
  firstRun = false,
  add,
}: {
  day?: Day;
  startHour: number;
  endHour: number;
  date: string;
  today: string;
  now: number;
  areas: Area[];
  projects: Project[];
  goals: Goal[];
  open?: (task: Task, section?: PanelSection) => void;
  toggle?: (task: Task) => void;
  loading: boolean;
  static?: boolean;
  firstRun?: boolean;
  add?: (text: string) => void;
}) {
  const blocks: Omit<Block, "column" | "columns">[] = [
    ...(day?.timed ?? []).map((task) => ({
      task,
      start: minutesOf(task.time ?? "00:00"),
      end: minutesOf(task.time ?? "00:00") + (task.durationMinutes ?? 0),
    })),
    ...(day?.events ?? []).map((event) => ({
      event,
      start: minutesOf(event.startTime),
      end: minutesOf(event.endTime),
    })),
  ];
  const visible = blocks.filter(
    (block) =>
      block.start < endHour * 60 &&
      Math.max(block.end, block.start + 32) > startHour * 60,
  );
  const showNow = date === today && now >= startHour * 60 && now < endHour * 60;
  const promptMinute = showNow ? now : Math.max(startHour * 60, Math.min(9 * 60, endHour * 60));
  return (
    <div
      data-timeline="true"
      className={s.grid}
      style={{ height: `calc(${endHour - startHour} * var(--hh))` }}
      aria-label="Day timeline"
      aria-busy={loading}
    >
      {Array.from(
        { length: isStatic ? Math.ceil(endHour - startHour) : Math.floor(endHour - startHour) + 1 },
        (_, index) => (
          <div
            key={index}
            className={s.hr}
            style={{ top: `calc(${index} * var(--hh))` }}
          >
            <span>{timeValue(timeOf((index + startHour) * 60), null)}</span>
          </div>
        ),
      )}
      {loading ? (
        <>
          <div
            className={s.skeleton}
            style={{
              position: "absolute",
              top: "calc(3 * var(--hh))",
              width: "100%",
            }}
          />
          <div
            className={s.skeleton}
            style={{
              position: "absolute",
              top: "calc(6 * var(--hh))",
              width: "100%",
            }}
          />
        </>
      ) : (
        layoutIntervals(visible).map((block) => (
          <TimelineBlock
            key={block.task?._id ?? block.event?._id}
            block={block}
            startHour={startHour}
            endHour={endHour}
            areas={areas}
            projects={projects}
            goals={goals}
            today={today}
            open={open}
            toggle={toggle}
            static={isStatic}
          />
        ))
      )}
      {date === today && now >= startHour * 60 && now <= endHour * 60 && (
        <div
          className={s.now}
          style={{ top: `calc(${(now - startHour * 60) / 60} * var(--hh))` }}
        >
          <span>{timeOf(now)}</span>
        </div>
      )}
      {firstRun && !loading && <div className={s.firstRun} data-first-run="true"
        style={{ top: `calc(${(promptMinute - startHour * 60) / 60} * var(--hh) + ${showNow ? "var(--space-18)" : "0px"})` }}>
        <b>Your day starts here.</b>
        <p>Type a task the way you would say it. Give it a time and it lands on this timeline.</p>
        <div className={s.chips}>{["lunch with Priya 1pm", "gym tomorrow 7am", "essay fri 5pm 2h"].map((text) =>
          <button type="button" className={s.f} key={text} onClick={() => add?.(text)}>{text}</button>)}</div>
      </div>}
    </div>
  );
}
