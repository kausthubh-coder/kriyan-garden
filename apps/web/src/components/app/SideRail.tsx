import { weekdayName, longDate } from "@kriyan/core";
import {
  addDays,
  deadlineCapacity,
  formatMinutes,
  goalProgress,
  weekStart,
} from "@kriyan/core";
import {
  areaColor,
  type Area,
  type Goal,
  type Task,
  type Week,
  type Variables,
} from "./types";
import { WeekLoadChart, DeadlineRow } from "./RailParts";
import s from "./App.module.css";
export function SideRail({
  week,
  tasks,
  goals,
  areas,
  date,
  today,
  filter,
  capacity,
  goDay,
  goGoals,
  open,
  loading,
  compact = false,
  addGoal,
}: {
  week?: Week;
  tasks: Task[];
  goals: Goal[];
  areas: Area[];
  date: string;
  today: string;
  filter: string;
  capacity: number;
  goDay: (date: string) => void;
  goGoals: () => void;
  open: (task: Task) => void;
  loading: boolean;
  compact?: boolean;
  addGoal?: () => void;
}) {
  const start = weekStart(date),
    shown = (areaId: string | null) => filter === "all" || areaId === filter;
  const worst = week
    ?.filter((day) => day.plannedMinutes > capacity)
    .sort((a, b) => b.plannedMinutes - a.plannedMinutes)[0];
  const deadlines = tasks
    .filter(
      (task) =>
        task.status === "active" &&
        task.deadline &&
        task.deadline >= today &&
        task.deadline <= addDays(today, 14) &&
        shown(task.areaId),
    )
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const activeGoals = goals.filter(
    (goal) => goal.status === "active" && shown(goal.areaId),
  );
  const hasHours = week?.some((day) => Object.entries(day.plannedMinutesByArea).some(([areaId, minutes]) => shown(areaId) && minutes > 0));
  const emptyArea = filter !== "all" ? `Nothing in ${areas.find((area) => area._id === filter)?.name}.` : null;
  return (
    <aside
      className={s.side}
      aria-label={
        compact ? "Week load and deadlines" : "Week load, deadlines and goals"
      }
    >
      <div>
        <h2 className={s.h}>
          {compact ? (
            <>
              Load<em>Hours with a length, by area</em>
            </>
          ) : (
            <>Week of {longDate(start)}</>
          )}
        </h2>
        {loading ? (
          <div className={s.skeleton} />
        ) : (
          <>
            <WeekLoadChart week={week} areas={areas} date={date} capacity={capacity} filter={filter} goDay={goDay} />
            {!hasHours ? <p className={s.empty}>{emptyArea ?? "Hours you plan show up here by area."}</p> : worst ? (
              <p className={s.cap}>
                <b className={s.bad}>
                  {weekdayName(worst.date)} is over capacity
                </b>{" "}
                by {formatMinutes(worst.plannedMinutes - capacity)}. Move
                something to a lighter day.
              </p>
            ) : (
              <p className={s.cap}>
                No day is over {formatMinutes(capacity)}. Tasks with no length
                are not counted.
              </p>
            )}
          </>
        )}
      </div>
      <div>
        <h2 className={s.h}>
          Deadlines{deadlines.length > 0 && <em>Time needed against time free</em>}
        </h2>
        {loading ? (
          <div className={s.skeleton} />
        ) : deadlines.length ? (
          deadlines.map((task) => {
            const free = deadlineCapacity(
                today,
                task.deadline ?? today,
                capacity,
                tasks,
              );
            return (
              <DeadlineRow key={task._id} task={task} areas={areas} free={free} open={open} />
            );
          })
        ) : (
          <p className={s.empty}>{emptyArea ?? "Nothing due in the next two weeks."}</p>
        )}
      </div>
      <div hidden={compact}>
        <h2 className={s.h}>
          Goals{activeGoals.length > 0 && <em>{activeGoals.length} active</em>}
        </h2>
        {loading ? (
          <div className={s.skeleton} />
        ) : activeGoals.length ? (
          activeGoals.map((goal) => {
            const metric = goal.metric;
            const { done, progress } = goalProgress(goal, today);
            return (
              <button
                key={goal._id}
                className={s.goal}
                onClick={goGoals}
                style={
                  {
                    "--c": areaColor(
                      areas.find((area) => area._id === goal.areaId),
                    ),
                  } as Variables
                }
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  <circle cx="14" cy="14" r="11" />
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    pathLength="100"
                    strokeDasharray={`${progress * 100} 100`}
                  />
                </svg>
                {goal.title}
                <span>
                  {metric.kind === "number"
                    ? `${done}${metric.unit === "%" ? "" : " "}${metric.unit}`
                    : `${Math.round(progress * 100)}%`}
                </span>
              </button>
            );
          })
        ) : (
          <div className={s.empty}>
            {emptyArea ?? "No goals yet."} <button onClick={addGoal}>Add a goal</button>
          </div>
        )}
      </div>
    </aside>
  );
}
