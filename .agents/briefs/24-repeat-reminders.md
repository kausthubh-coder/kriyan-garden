# Brief 24: repeats and reminders with full control

You are the only Codex session on this machine. Work in this checkout (branch `t3code/42c69ded`), on top of brief 23's commits. Do not start until brief 23 is committed.

Memory is the main risk on this laptop (the owner's browser holds about 22 GB). Before `next build`, Playwright, Gradle or the emulator, read `Win32_OperatingSystem.FreeVirtualMemory` and start only with at least 3 GB of commit free. Run one heavy process at a time. While Gradle or the emulator runs, a watchdog checks every 10 seconds and stops your heavy process if free commit falls below 1 GB. The emulator is always headless (`-no-window -no-audio -no-snapshot -memory 1024 -dns-server 8.8.8.8,1.1.1.1`). Never stop the owner's applications or the Codex desktop app's helper processes. Commit locally after each part. Do not push, deploy or make a release build; local test builds only.

Read first: `AGENTS.md`, `docs/design/reference/` and the prototype for the task editor, `packages/core/src/` (`format.ts`, `reminders.ts`, `quickAdd*.ts`, `dates.ts`), `packages/backend/convex/model/tasks.ts`, `model/nextDate.ts`, `model/reminders.ts`, `reminders.ts`, `validators.ts`, `apps/web/src/components/app/TaskPanel.tsx`, `apps/mobile/src/TaskSheet.tsx`, `apps/mobile/src/notifications.ts`, `apps/web/src/lib/operations/schemas.ts` and `index.ts`.

## Goal

Repeats and reminders as flexible as TickTick's, the same in the web app, the Android app, quick add and the MCP. All rules live once in `packages/core`; the backend, both apps and the MCP call them.

## Part A: the repeat rule

Extend the stored `repeat` so every existing row still validates unchanged (all new fields optional, old meaning kept):

```
repeat: null | {
  every: 1..1000,
  unit: "day" | "week" | "month" | "year",
  weekdays?: number[],                       // week unit, Sunday=0 (existing)
  monthDay?: { kind: "day", day: 1..31 }     // "on the 31st" (falls back to the last day in short months)
           | { kind: "weekday", nth: 1 | 2 | 3 | 4 | -1, weekday: 0..6 }   // "2nd Tue", "last Fri"
           | { kind: "last_day" },
  basis?: "schedule" | "completion",         // default "schedule"; "completion" counts from the day it was done
  ends?: { kind: "on", date } | { kind: "after", count: 1..1000 },
}
```

- One pure function in `packages/core`, `nextOccurrence(rule, { date, completedOn, index })`, returns the next date or `null` when the series has ended. Unit tests cover: every N days; weekdays with intervals of 1 and 2 weeks; "every weekday" (Mon to Fri); day 31 across February and leap years without drift (Jan 31, Feb 28, Mar 31: the target day comes from the rule, not the previous date); 2nd Tuesday; last Friday; last day; yearly on 29 Feb; `basis: "completion"`; `ends` on a date and after N.
- Delete `model/nextDate.ts` and call the core function. Store the occurrence number on each task in the series (`repeatIndex`, nullable, optional in the schema) so `ends.after` works.
- A rule with `monthDay` needs unit `month` or `year`; `weekdays` needs `week`. Reject other combinations with a sentence naming the fix, in the backend and in zod.
- New task action **Skip this time**: moves a repeating task to its next occurrence without completing it. Backend function, web button, Android action, MCP tool `skip_occurrence`.
- `repeatText` reads naturally for every rule: "Every weekday", "Every 2 weeks on Mon and Wed", "Monthly on the last Fri", "Every month on the 31st", "Every 3 days after done", "Every week until Fri 18 Dec", "Every day, 10 times".

## Part B: reminders

- Keep the existing types. Add a deadline reminder, `{ type: "deadline", daysBefore: 0..30, time: "HH:MM" }` ("2 days before the deadline at 18:00"). It works for tasks with a deadline and no planned date, which is most homework. Today a task without a date never reminds; fix that for deadline reminders.
- Reminders on a repeating task carry over to each new occurrence (check this already happens and add a test).
- Android notification actions: **Done**, **Snooze 10 min**, **Snooze 1 hour**, **Tomorrow morning** (uses the profile's day start hour). Snooze schedules one extra reminder job; it does not change the task. Done completes the task (and creates the next occurrence).
- Daily summary: profile setting `dailySummaryTime` (`HH:MM` or null, default null). At that local time, one push: "4 tasks today, 2 due this week." Settings screen on web and Android, `update_settings` in the MCP. Use a Convex cron or scheduled job per owner; times come from the profile timezone, never UTC.
- Notification text uses people's dates: "Today 14:30", "Due Thu 1 Oct". Never an ISO date. Today the body reads `2026-10-02, any time`; fix it.
- Web: reminders are Android-only today. Do not add web push in this brief. Write in the report what web push would need (keys, service worker, env vars) so the owner can decide.

## Part C: editing

- Web `TaskPanel` and Android `TaskSheet` get a repeat editor that follows the existing chip style. Presets first: Does not repeat, Daily, Weekdays, Weekly on <this day>, Monthly on the <nth weekday>, Monthly on the <day>, Yearly on <date>. Then **Custom**: every N unit, weekday picker, month mode, "Repeat from: due date / completion", "Ends: never / on date / after N times". Reminder editor gains "Before the deadline" and a custom "N minutes/hours/days before". Every control meets the AGENTS design rules (44px on touch, focus-visible, no colour-only status, dates like "Thu 1 Oct").
- Quick add (`packages/core/src/quickAdd*.ts`) understands at least: "every weekday", "every 2 weeks on mon wed", "every month on the last friday", "every month on the 15th", "every 3 days after done", "until 18 dec", "10 times", "remind 30m before", "remind 2 days before due at 6pm". Add cases to `quickAddCases.ts`.

## Part D: MCP

- `create_task`, `update_task`, `apply_plan` and `quick_add` accept the full rule and the new reminder. Update zod schemas, descriptions and the server instructions with one example each of a monthly "2nd Tuesday" rule and a deadline reminder.
- `readBack` uses `repeatText` and `reminderText` instead of the raw fields.
- New `skip_occurrence` tool.
- Update `docs/mcp.md` and `docs/site/mcp.md`.

## Tests and verify

Unit tests for the core function, `repeatText`, `reminderText` and quick add cases; Convex tests for complete, skip and ends; operation tests for the MCP schemas. One short live check: on the web app with a test-kriyan account, create a "last Friday" monthly task with a deadline reminder through the MCP, see it in the task panel, complete it and see the next date. One Android check on a local debug build: a reminder arrives and Snooze 10 min fires again. Keep it short; the owner prefers shipping once the core works.

```
bun run typecheck
bun run lint
bun run test
bun run build
```

Write `docs/reports/24-repeat-reminders.md` with what changed, screenshots of the two editors (web 1440 and Android), the real command output including failures, and the web push notes. Commit on `t3code/42c69ded`. Do not push or deploy.
