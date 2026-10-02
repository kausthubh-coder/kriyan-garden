import { addDays, getWeekday, weekdayIndex } from "./dates";
import type { Reminder } from "./reminders";
import { firstOccurrence, type RepeatRule } from "./repeat";
import { extractSchedule } from "./quickAddSchedule";

export interface QuickAddContext {
  today: string;
  defaultDate: string | null;
  defaultAreaId: string;
  areas: readonly { id: string; name: string }[];
  projects: readonly { id: string; name: string; areaId: string }[];
}

export interface QuickAddResult {
  title: string;
  areaId: string;
  projectId: string | null;
  date: string | null;
  time: string | null;
  durationMinutes: number | null;
  deadline: string | null;
  repeat: RepeatRule | null;
  reminders: Reminder[];
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Port of the approved prototype's parser, with all defaults supplied by the caller. */
export function parse(text: string, context: QuickAddContext): QuickAddResult {
  const result: QuickAddResult = {
    title: "",
    areaId: context.defaultAreaId,
    projectId: null,
    date: context.defaultDate,
    time: null,
    durationMinutes: null,
    deadline: null,
    repeat: null,
    reminders: [],
  };
  let dateSpecified = false;
  const schedule = extractSchedule(text, context.today);
  result.deadline = schedule.deadline;
  result.repeat = schedule.repeat;
  result.reminders = schedule.reminders;
  let remaining = schedule.rest;

  remaining = remaining.replace(/\s(\d+(?:\.\d+)?)\s?h(?:(?:ou)?rs?)?(?:\s?(\d+)\s?m(?:ins?)?)?(?=\s)/i, (_match: string, hours: string, minutes: string | undefined) => {
    result.durationMinutes = Math.round(parseFloat(hours) * 60) + (parseInt(minutes ?? "", 10) || 0);
    return " ";
  });
  remaining = remaining.replace(/\s(\d+)\s?m(?:ins?)?(?=\s)/i, (match: string, minutes: string) => {
    if (result.durationMinutes !== null) return match;
    result.durationMinutes = parseInt(minutes, 10);
    return " ";
  });
  remaining = remaining.replace(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (_match: string, hours: string, minutes: string | undefined, meridiem: string) => {
    let hour = parseInt(hours, 10) % 12;
    if (/pm/i.test(meridiem)) hour += 12;
    result.time = formatTime(hour * 60 + (parseInt(minutes ?? "", 10) || 0));
    return " ";
  });
  remaining = remaining.replace(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (match: string, hours: string, minutes: string) => {
    if (result.time) return match;
    result.time = formatTime(parseInt(hours, 10) * 60 + parseInt(minutes, 10));
    return " ";
  });
  remaining = remaining.replace(/\sat\s(\d{1,2})(?=\s)/i, (match: string, hours: string) => {
    if (result.time) return match;
    let hour = parseInt(hours, 10);
    if (hour < 7) hour += 12;
    if (hour > 23) return match;
    result.time = formatTime(hour * 60);
    return " ";
  });
  remaining = remaining.replace(/\s(today|tonight|tomorrow|tmrw?|tom|later|someday)(?=\s)/i, (_match: string, word: string) => {
    const day = word.toLowerCase();
    result.date = day === "later" || day === "someday" ? null : day === "today" || day === "tonight" ? context.today : addDays(context.today, 1);
    dateSpecified = true;
    return " ";
  });
  remaining = remaining.replace(/\s(?:on\s)?(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?(?=\s)/i, (match: string, word: string) => {
    if (dateSpecified) return match;
    const days = (weekdayIndex(word) - getWeekday(context.today) + 7) % 7 || 7;
    result.date = addDays(context.today, days);
    dateSpecified = true;
    return " ";
  });
  remaining = remaining.replace(/\s#([\w-]+)/g, (match: string, word: string) => {
    const tag = word.toLowerCase();
    const area = context.areas.find((candidate) => candidate.id.startsWith(tag) || candidate.name.toLowerCase().startsWith(tag));
    if (area) {
      result.areaId = area.id;
      return " ";
    }
    const project = context.projects.find((candidate) => candidate.id.startsWith(tag) || candidate.name.toLowerCase().replace(/\s/g, "").startsWith(tag));
    if (project) {
      result.projectId = project.id;
      result.areaId = project.areaId;
      return " ";
    }
    return match;
  });
  // "every friday" starts on the next Friday unless a day was typed.
  if (result.repeat && !dateSpecified) result.date = firstOccurrence(result.repeat, result.date ?? context.today);
  result.title = remaining.replace(/\s+/g, " ").trim();
  if (result.title) result.title = result.title.charAt(0).toUpperCase() + result.title.slice(1);
  return result;
}
