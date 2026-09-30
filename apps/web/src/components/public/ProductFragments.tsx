import { seed, id } from "../demo/seed";
import { Timeline } from "../app/Timeline";
import { GoalSummary } from "../app/GoalSummary";
import { DeadlineRow, WeekLoadChart } from "../app/RailParts";
import { TaskRow } from "../app/ViewParts";
import { addDays, weekStart, layout } from "@kriyan/core";
import type { Day, Week } from "../app/types";
import app from "../app/App.module.css";
import s from "./Public.module.css";

const today = "2026-09-30";
const sample = seed(today);
const goal = {...sample.goals[0], milestones: Array.from({length:5}, (_, index) => ({...sample.goals[0], _id:id<"milestones">(`landing-${index}`), goalId: sample.goals[0]._id, title: `Step ${index + 1}`, targetDate:null, doneAt:index < 2 ? 0 : null}))};
const tasks = [
  {...sample.tasks[2]},
  {...sample.tasks[3], time:"14:00"},
  {...sample.tasks[4], title:"Send the invoice to Hartley", time:"15:15"},
];
const day: Day = {date:today, timed:tasks, anytime:[], unscheduled:[], events:[sample.events[0], {...sample.events[1], title:"Project check-in", startTime:"13:00", endTime:"13:30"}], plannedMinutes:120, countWithoutDuration:1};
const fractions = [[.6,.4,0],[1,0,0],[.55,.35,.1],[.45,.55,0],[.25,.6,.15],[1,0,0],[0,0,1]];
const week: Week = [150,90,210,210,410,45,25].map((total,index) => ({date:addDays(weekStart(today),index), timed:[], anytime:[], unscheduled:[], events:[], countWithoutDuration:0, plannedMinutes:total, plannedMinutesByArea:{school:total * fractions[index][0], biz:total * fractions[index][1], life:total * fractions[index][2]}, taskCount:3}));

export function TimelineFragment() {
  return <div className={`${app.app} ${s.visual} ${s.timelineVisual}`} aria-hidden="true">
    <Timeline day={day} startHour={10} endHour={16} date={today} today={today} now={705} areas={sample.areas} projects={sample.projects} goals={[goal]} loading={false} />
  </div>;
}
export function PaceFragment() {
  return <div className={`${app.app} ${s.visual} ${s.paceVisual}`} aria-hidden="true">
    <GoalSummary goal={goal} areas={sample.areas} today={today} />
    <h3 className={app.h}>Deadlines<em>Time needed against time free</em></h3>
    <DeadlineRow task={{...sample.tasks[2], title:"Calculus II midterm", durationMinutes:360, deadline:"2026-10-06"}} areas={sample.areas} free={420} />
    <DeadlineRow task={{...sample.tasks[3], title:"Android build", durationMinutes:720, deadline:"2026-10-09"}} areas={sample.areas} free={540} />
  </div>;
}
export function LoadFragment() {
  return <div className={`${app.app} ${s.visual} ${s.loadVisual}`} aria-hidden="true">
    <h3 className={app.h}>This week<em>19h planned</em></h3>
    <WeekLoadChart week={week} areas={sample.areas} date={today} capacity={360} barHeight={layout.landingChartHeight} />
    <p className={s.capacity}><b>Friday is over capacity</b> by 50m. Move something to a lighter day.</p>
    {[tasks[0], tasks[1], sample.tasks[0]].map(task => <TaskRow key={task._id} task={task} areas={sample.areas} projects={sample.projects} goals={[]} today={today} />)}
  </div>;
}
