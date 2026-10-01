import type { QuickAddResult } from "./quickAdd";
/** One source for the public token table and executable parser examples. */
export const quickAddGrammar: { tokens: string[]; meaning: string; suffix: string; expected: Partial<QuickAddResult> }[] = [
  { tokens: ["today", "tonight"], meaning: "The local day supplied by the client", suffix: "", expected: { date: "2026-09-29" } },
  { tokens: ["tomorrow", "tmr", "tmrw", "tom"], meaning: "The next local day", suffix: "", expected: { date: "2026-09-30" } },
  { tokens: ["later", "someday"], meaning: "No date", suffix: "", expected: { date: null } },
  { tokens: ["mon", "monday"], meaning: "Next Monday, even if today is Monday", suffix: "", expected: { date: "2026-10-05" } },
  { tokens: ["tue", "tues", "tuesday"], meaning: "Next Tuesday", suffix: "", expected: { date: "2026-10-06" } },
  { tokens: ["wed", "wednesday", "on Wednesday"], meaning: "Next Wednesday; on is optional", suffix: "", expected: { date: "2026-09-30" } },
  { tokens: ["thu", "thur", "thurs", "thursday"], meaning: "Next Thursday", suffix: "", expected: { date: "2026-10-01" } },
  { tokens: ["fri", "friday"], meaning: "Next Friday", suffix: "", expected: { date: "2026-10-02" } },
  { tokens: ["sat", "saturday"], meaning: "Next Saturday", suffix: "", expected: { date: "2026-10-03" } },
  { tokens: ["sun", "sunday"], meaning: "Next Sunday", suffix: "", expected: { date: "2026-10-04" } },
  { tokens: ["7am", "7:00am", "at 7 am"], meaning: "12-hour time, with optional at and spaces", suffix: "", expected: { time: "07:00" } },
  { tokens: ["5pm", "5:00pm", "at 5 pm"], meaning: "12-hour afternoon time", suffix: "", expected: { time: "17:00" } },
  { tokens: ["17:30", "at 17:30"], meaning: "24-hour time", suffix: "", expected: { time: "17:30" } },
  { tokens: ["at 1"], meaning: "Bare hour with at; hours below 7 mean afternoon", suffix: "", expected: { time: "13:00" } },
  { tokens: ["2h", "2hr", "2hrs", "2hour", "2hours", "2 h"], meaning: "Length in hours", suffix: "", expected: { durationMinutes: 120 } },
  { tokens: ["1.5h", "1h30m", "1h 30min", "1h30mins"], meaning: "Decimal hours or combined hours and minutes", suffix: "", expected: { durationMinutes: 90 } },
  { tokens: ["45m", "45min", "45mins", "45 m"], meaning: "Length in minutes", suffix: "", expected: { durationMinutes: 45 } },
  { tokens: ["#school", "#sch"], meaning: "Area name or ID prefix, case insensitive", suffix: "", expected: { areaId: "school" } },
  { tokens: ["#music"], meaning: "An existing area you named yourself (Music in this example)", suffix: "", expected: { areaId: "music" } },
  { tokens: ["#econ", "#ECON101"], meaning: "Project or course prefix; also selects its area", suffix: "", expected: { areaId: "school", projectId: "econ" } },
];
