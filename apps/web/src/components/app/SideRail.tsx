import {
  addDays,
  deadlineCapacity,
  formatMinutes,
  goalProgress,
  weekStart,
} from "@kriyan/core";
import {
  areaColor,
  dayName,
  longDate,
  shortDate,
  type Area,
  type Goal,
  type Task,
  type Week,
  type Variables,
} from "./types";
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
            <div className={s.load}>
              {Array.from({ length: 7 }, (_, index) => {
                const day = week?.[index],
                  dayDate = addDays(start, index),
                  total = day?.plannedMinutes ?? 0;
                const height = Math.round(Math.min(total / 480, 1) * 66);
                const loadLabel = total
                  ? formatMinutes(total)
                  : day?.taskCount
                    ? `${day.taskCount} ${day.taskCount === 1 ? "task" : "tasks"}`
                    : "Free";
                return (
                  <button
                    key={dayDate}
                    onClick={() => goDay(dayDate)}
                    className={dayDate === date ? s.t : ""}
                    aria-label={`${dayName(dayDate)[0]} ${loadLabel}, ${dayName(dayDate)}${total > capacity ? ", over capacity" : ""}`}
                  >
                    <i style={{ height }}>
                      {areas
                        .filter((area) => shown(area._id))
                        .map((area) => (
                          <u
                            key={area._id}
                            style={{
                              height: `${total ? ((day?.plannedMinutesByArea[area._id] ?? 0) / total) * 100 : 0}%`,
                              background: areaColor(area),
                            }}
                          />
                        ))}
                    </i>
                    {dayName(dayDate)[0]} <small>{loadLabel}</small>
                  </button>
                );
              })}
            </div>
            {worst ? (
              <p className={s.cap}>
                <b className={s.bad}>{dayName(worst.date)} is over capacity</b>{" "}
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
          Deadlines<em>Time needed against time free</em>
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
              ),
              needed = task.durationMinutes ?? 60,
              spare = free - needed;
            return (
              <div
                key={task._id}
                className={s.dl}
                style={
                  {
                    "--c":
                      spare < 0
                        ? "var(--hot)"
                        : areaColor(
                            areas.find((area) => area._id === task.areaId),
                          ),
                    "--need": free ? Math.min((needed / free) * 100, 100) : 100,
                  } as Variables
                }
              >
                <div className={s.top}>
                  <i
                    className={s.dot}
                    style={
                      {
                        "--c": areaColor(
                          areas.find((area) => area._id === task.areaId),
                        ),
                      } as Variables
                    }
                  />
                  <button onClick={() => open(task)}>{task.title}</button>
                  <span>{shortDate(task.deadline ?? today)}</span>
                </div>
                <div className={s.cush}>
                  <i />
                </div>
                <p>
                  {formatMinutes(needed)} needed, {formatMinutes(free)} free
                  <b className={spare < 0 ? s.bad : undefined}>
                    {formatMinutes(Math.abs(spare))}{" "}
                    {spare < 0 ? "short" : "to spare"}
                  </b>
                </p>
                {task.durationMinutes === null && (
                  <p>Assumes 1h because no length is set.</p>
                )}
              </div>
            );
          })
        ) : (
          <div className={s.empty}>No deadlines in this area.</div>
        )}
      </div>
      <div hidden={compact}>
        <h2 className={s.h}>
          Goals<em>{activeGoals.length} active</em>
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
            No active goals yet. <button onClick={goGoals}>View goals</button>
          </div>
        )}
      </div>
    </aside>
  );
}
