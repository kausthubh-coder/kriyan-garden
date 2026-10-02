import { z } from "zod";

/** How Kriyan maps what an assistant already knows onto planner records. Shared by the instructions and the prompts. */
const MAPPING = "Map classes, lectures, labs, shifts and other fixed weekly times to schedule blocks (events), each class to a course, homework, readings and deliverables to tasks with deadlines, longer efforts to projects or goals, and routines to habits or repeating tasks. Give a task a planned date only when the person wants one. Never invent a task length or a due date; leave them empty when the source does not say.";
const PREVIEW = "Send everything in one apply_plan call with dryRun: true, show the person a short summary of what would be added, and apply the same plan without dryRun only after they agree. Re-running a plan never duplicates what is already stored.";

export const MCP_INSTRUCTIONS = [
  "Kriyan is the person's planner. Help them organise and plan their life with the AI they already use.",
  "Start with get_overview, and list_events before touching the schedule. Areas belong to the person: use their area names and never assume School, Business or Life.",
  `When asked to organise or plan their life, first gather what you can already see: syllabi, timetables, assignment lists, calendars, project notes and READMEs in the working folder, and this conversation. ${MAPPING}`,
  `${PREVIEW} Afterwards, show the result with get_week.`,
  "For single changes use the specific tool. Read before you write, never invent IDs, and when a name is ambiguous ask the person to choose from the candidates.",
  "After every write, tell the person what its readBack says, including what was already there. Count accurately: say how many tasks have a due date and how many do not.",
].join("\n\n");

const prompt = (text: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text } }] });
const optionalText = z.string().trim().max(2000).optional();

type PromptArgs = Record<string, unknown>;
const given = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
export const MCP_PROMPTS: Record<string, { title: string; description: string; argsSchema: z.ZodObject; build: (args: PromptArgs) => ReturnType<typeof prompt> }> = {
  organize_my_life: {
    title: "Organise my life",
    description: "Read your classes, homework and projects from this workspace and put them into Kriyan, after you approve the plan.",
    argsSchema: z.object({ focus: optionalText.describe("Anything to focus on or leave out, for example \"just this semester\".") }),
    build: args => prompt([
      "Organise my life in Kriyan.",
      "1. Call get_overview and list_events to see my areas, courses, projects, goals and schedule.",
      `2. Read what you can already see about my work and life: syllabi, timetables, assignment lists, calendars, project notes and READMEs in this workspace, and our conversation. ${MAPPING}`,
      `3. ${PREVIEW}`,
      "4. Then show me today and the next few deadlines with get_week.",
      given(args.focus) ? `Focus: ${given(args.focus)}` : "",
    ].filter(Boolean).join("\n")),
  },
  add_class_schedule: {
    title: "Add my class schedule",
    description: "Turn a timetable into courses and weekly class times.",
    argsSchema: z.object({ source: optionalText.describe("Where the timetable is, or the timetable itself.") }),
    build: args => prompt([
      "Add my class schedule to Kriyan.",
      given(args.source) ? `Timetable: ${given(args.source)}` : "Find my timetable in this workspace or ask me for it.",
      "Call get_overview and list_events first. Each class becomes a course in the right area and one schedule block per distinct time slot, with weekdays, start and end time, location, and the term's first and last dates when known.",
      PREVIEW,
    ].join("\n")),
  },
  plan_my_week: {
    title: "Plan my week",
    description: "Spread this week's work across the days you have free.",
    argsSchema: z.object({}),
    build: () => prompt([
      "Plan my week in Kriyan.",
      "Call get_week and list_tasks with status active. Look at deadlines, each day's free minutes and my class times.",
      "Propose a planned day for unscheduled work that has a deadline, earliest deadline first, without going over any day's capacity. Do not invent task lengths; tasks without one count as unknown, so say so.",
      "Show me the proposal as a short list by day, then move the tasks with move_task once I agree.",
    ].join("\n")),
  },
  plan_today: {
    title: "Plan today",
    description: "What is on today, what is overdue, and a realistic order.",
    argsSchema: z.object({}),
    build: () => prompt([
      "Plan my day with Kriyan.",
      "Call get_day for today and list_tasks with due: overdue.",
      "Tell me what is fixed (classes and timed tasks), what is overdue, and suggest an order for the rest that fits my free minutes. Ask before moving or changing anything.",
    ].join("\n")),
  },
  weekly_review: {
    title: "Weekly review",
    description: "What got done, what slipped, goal progress and what to move.",
    argsSchema: z.object({}),
    build: () => prompt([
      "Run my weekly review in Kriyan.",
      "Call list_tasks with status completed (use completedAt to keep the last seven days), list_tasks with due: overdue, list_goals and list_habits.",
      "Summarise what got done, what slipped, how each goal and habit is going, then suggest what to reschedule, drop or break down. Make changes only after I agree.",
    ].join("\n")),
  },
};
