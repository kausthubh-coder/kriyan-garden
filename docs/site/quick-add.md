# Quick add

Type a title, followed by any combination of a day, time, #tag, length, deadline, repeat and reminders. Every part except the title is optional. Length is never inferred. The Day view defaults to its selected day and area; the API can supply different defaults. Dates use your local day, not the server's UTC date.

Area names belong to you. Music is a custom area in these tested examples; use your own area names.

## Tokens

This table is generated from the same fixtures exercised by quickAdd.test.ts. Rebuild it with `bun run docs:quick-add` from the repository root.

| Tokens and examples | Meaning |
| --- | --- |
| `today`, `tonight` | The local day supplied by the client |
| `tomorrow`, `tmr`, `tmrw`, `tom` | The next local day |
| `later`, `someday` | No date |
| `mon`, `monday` | Next Monday, even if today is Monday |
| `tue`, `tues`, `tuesday` | Next Tuesday |
| `wed`, `wednesday`, `on Wednesday` | Next Wednesday; on is optional |
| `thu`, `thur`, `thurs`, `thursday` | Next Thursday |
| `fri`, `friday` | Next Friday |
| `sat`, `saturday` | Next Saturday |
| `sun`, `sunday` | Next Sunday |
| `7am`, `7:00am`, `at 7 am` | 12-hour time, with optional at and spaces |
| `5pm`, `5:00pm`, `at 5 pm` | 12-hour afternoon time |
| `17:30`, `at 17:30` | 24-hour time |
| `at 1` | Bare hour with at; hours below 7 mean afternoon |
| `2h`, `2hr`, `2hrs`, `2hour`, `2hours`, `2 h` | Length in hours |
| `1.5h`, `1h30m`, `1h 30min`, `1h30mins` | Decimal hours or combined hours and minutes |
| `45m`, `45min`, `45mins`, `45 m` | Length in minutes |
| `#school`, `#sch` | Area name or ID prefix, case insensitive |
| `#music` | An existing area you named yourself (Music in this example) |
| `#econ`, `#ECON101` | Project or course prefix; also selects its area |
| `due fri`, `due on friday`, `due 2 oct` | Deadline: a weekday, today, tomorrow, or a day and month |
| `daily`, `every day` | Repeat every day |
| `every weekday`, `weekdays` | Repeat Monday to Friday |
| `every 2 weeks`, `every other week` | Repeat every N days, weeks, months or years |
| `every mon wed`, `every monday and wednesday`, `weekly on mon wed` | Repeat on those weekdays; starts on the first of them |
| `every month on the 2nd tue`, `monthly on the second tuesday` | Monthly on the 1st to 4th or last weekday |
| `every month on the last day`, `monthly on the last day` | Monthly on the last day; on the 15th works too |
| `daily after done`, `daily after completion` | Count the next date from when it was done |
| `daily until 18 dec`, `daily until dec 18` | Repeat until a date |
| `daily 10 times` | Repeat a number of times |
| `remind 30m before`, `remind me 30 minutes before` | Reminder before the start time (m, h or d) |
| `remind at 8am`, `remind me at 08:00` | Reminder at a time on the day |
| `remind morning of`, `remind me in the morning` | Reminder at 09:00 on the day |
| `remind day before`, `remind me the day before` | Reminder at 18:00 the evening before |
| `remind at start` | Reminder at the start time |
| `remind 2 days before due`, `remind me 2d before the deadline at 6pm` | Reminder before the deadline, at 18:00 unless a time is given |

## How the parser decides

The first day and first time win. A weekday means its next occurrence, including a week from today when it is the same weekday. An unknown #tag stays in the title. Area tags are checked before project tags. The parser capitalizes the first letter of the remaining title and collapses spaces. Numbers and words that do not match a token stay in the title. In particular, "20 minutes" is ordinary title text; use "20m" to set a length. A repeat without a typed day starts on the first day it lands on. ISO dates are not parsed; use "2 oct" or "oct 2". Phrases the parser does not recognise stay in the title, so check the preview chips before adding.

## Tested examples

| Input | Parsed fields |
| --- | --- |
| "gym tomorrow 7am" | {"title":"Gym","date":"2026-09-30","time":"07:00"} |
| "practice piano tomorrow #music" | {"title":"Practice piano","areaId":"music","date":"2026-09-30"} |
| "call amma" | {"title":"Call amma"} |
| "essay fri #econ 2h" | {"title":"Essay","areaId":"school","projectId":"econ","date":"2026-10-02","durationMinutes":120} |
| "read for 20 minutes at 9" | {"title":"Read for 20 minutes","time":"09:00"} |
| "standup 9:30 15m #biz" | {"title":"Standup","areaId":"biz","time":"09:30","durationMinutes":15} |
| "revise 1h30m tonight" | {"title":"Revise","date":"2026-09-29","durationMinutes":90} |
| "buy milk later" | {"title":"Buy milk","date":null} |
| "lunch at 1" | {"title":"Lunch","time":"13:00"} |
| "report tue" | {"title":"Report","date":"2026-10-06"} |
| "study on Wednesday 1.5hrs" | {"title":"Study","date":"2026-09-30","durationMinutes":90} |
| "call at 12am" | {"title":"Call","time":"00:00"} |
| "lunch 12pm" | {"title":"Lunch","time":"12:00"} |
| "read #unknown" | {"title":"Read #unknown"} |
| "essay #ECON101" | {"title":"Essay","projectId":"econ","areaId":"school"} |
| "standup #business" | {"title":"Standup","areaId":"biz"} |
| "call today fri" | {"title":"Call fri","date":"2026-09-29"} |
| "standup every weekday 9:30" | {"title":"Standup","date":"2026-10-01","time":"09:30","repeat":{"every":1,"unit":"week","weekdays":[1,2,3,4,5]}} |
| "gym every 2 weeks on mon wed" | {"title":"Gym","date":"2026-10-05","repeat":{"every":2,"unit":"week","weekdays":[1,3]}} |
| "club every month on the last friday" | {"title":"Club","date":"2026-10-30","repeat":{"every":1,"unit":"month","monthDay":{"kind":"weekday","nth":-1,"weekday":5}}} |
| "pay rent every month on the 15th" | {"title":"Pay rent","date":"2026-10-15","repeat":{"every":1,"unit":"month","monthDay":{"kind":"day","day":15}}} |
| "water plants every 3 days after done" | {"title":"Water plants","repeat":{"every":3,"unit":"day","basis":"completion"}} |
| "piano daily until 18 dec" | {"title":"Piano","repeat":{"every":1,"unit":"day","ends":{"kind":"on","date":"2026-12-18"}}} |
| "physio weekly 10 times" | {"title":"Physio","repeat":{"every":1,"unit":"week","ends":{"kind":"after","count":10}}} |
| "call mom fri 5pm remind 30m before" | {"title":"Call mom","date":"2026-10-02","time":"17:00","reminders":[{"type":"before","minutes":30}]} |
| "essay due fri remind 2 days before due at 6pm" | {"title":"Essay","deadline":"2026-10-02","reminders":[{"type":"deadline","daysBefore":2,"time":"18:00"}]} |
| "lab report due 9 oct" | {"title":"Lab report","deadline":"2026-10-09"} |

The example fixture uses Tuesday 29 September 2026 as today and 1 October as the selected day. Your dates follow your local calendar.
