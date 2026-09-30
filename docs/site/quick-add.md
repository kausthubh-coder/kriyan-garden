# Quick add

Type a title, followed by any combination of a day, time, #tag and length. Every part except the title is optional. Length is never inferred. The Day view defaults to its selected day and area; the API can supply different defaults. Dates use your local day, not the server's UTC date.

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
| `#econ`, `#ECON101` | Project or course prefix; also selects its area |

## How the parser decides

The first day and first time win. A weekday means its next occurrence, including a week from today when it is the same weekday. An unknown #tag stays in the title. Area tags are checked before project tags. The parser capitalizes the first letter of the remaining title and collapses spaces. Numbers and words that do not match a token stay in the title. In particular, "20 minutes" is ordinary title text; use "20m" to set a length. ISO dates, deadlines, repeat rules and reminders are edited in task details, not parsed from this input.

## Tested examples

| Input | Parsed fields |
| --- | --- |
| "gym tomorrow 7am" | {"title":"Gym","date":"2026-09-30","time":"07:00"} |
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

The example fixture uses Tuesday 29 September 2026 as today and 1 October as the selected day. Your dates follow your local calendar.
