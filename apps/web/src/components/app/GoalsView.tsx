"use client";
import { goalProgress, plannerCopy } from "@kriyan/core";
import { Icon } from "./Icon";
import { GoalSummary } from "./GoalSummary";
import { Filters } from "./Filters";
import {
  TaskRow,
  ViewHeader,
  ViewSkeleton,
  sortTasks,
  type ViewProps,
} from "./ViewParts";
import { areaColor, type Goal, type Variables } from "./types";
import s from "./App.module.css";
type GoalsProps = ViewProps & { openGoal: (goal: Goal) => void };
export function GoalsView(p: GoalsProps) {
  const goals = p.goals.filter(
    (g) => p.filter === "all" || g.areaId === p.filter,
  );
  return (
    <main className={`${s.page} ${s.goalsPage}`}>
      <ViewHeader
        title="Goals"
        settings={p.settings}
        subtitle={goals.length ? `${goals.filter((g) => g.status === "active").length} active` : undefined}
        actions={
          <button
            className={`${s.btn} ${s.ghosty}`}
            onClick={() => p.addGoal?.()}
            disabled={!p.areas.length}
          >
            <Icon name="plus" />
            Add goal
          </button>
        }
      />
      {(p.goals.length > 0 || p.filter !== "all") && <Filters areas={p.areas} filter={p.filter} onChange={p.setFilter} />}
      {p.loading ? (
        <ViewSkeleton kind="goals" />
      ) : goals.length ? (
        goals.map((goal) => <GoalCard {...p} goal={goal} key={goal._id} />)
      ) : (
        p.filter !== "all" ? <p className={s.empty}>Nothing in {p.areas.find((area) => area._id === p.filter)?.name}.</p> :
        <div className={s.bigEmpty}>
          <h2>{plannerCopy.noGoals}</h2>
          <p>{plannerCopy.goalExplanation}</p>
          <button className={s.btn} onClick={() => p.addGoal?.()} disabled={!p.areas.length}><Icon name="plus" />Add your first goal</button>
          <div className={s.goalExamples}>Or start from an example
            <div className={s.chips}>
              {([
                ["blue", "Finish the semester with a 3.8 GPA", { kind: "number", current: 0, target: 3.8, unit: "GPA" }],
                ["orange", "Launch the app by December", { kind: "milestones" }],
                ["green", "Run a 10k", { kind: "number", current: 0, target: 10, unit: "km" }],
              ] as const).map(([color, title, metric]) => {
                const area = p.areas.find((area) => area.color === color) ?? p.areas[0];
                return <button type="button" className={s.f} key={title} disabled={!area}
                  style={{ "--c": areaColor(area) } as Variables}
                  onClick={() => p.addGoal?.({ title, areaId: area?._id, metric })}><i className={s.dot} />{title}</button>;
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function GoalCard(p: GoalsProps & { goal: Goal }) {
  const { goal } = p,
    progress = goalProgress(goal, p.today);
  const linked = p.tasks
    .filter((t) => t.goalId === goal._id)
    .sort(
      (a, b) =>
        Number(a.status === "completed") - Number(b.status === "completed") ||
        (a.date ?? "9").localeCompare(b.date ?? "9") ||
        sortTasks(a, b),
    );
  return (
    <section
      className={s.gcard}
      style={
        {
          "--c": areaColor(p.areas.find((a) => a._id === goal.areaId)),
          "--p": progress.progress * 100,
          "--e": (progress.expected ?? 0) * 100,
        } as Variables
      }
    >
      <GoalSummary goal={goal} areas={p.areas} today={p.today} open={p.openGoal} />
      {goal.milestones.length > 0 && (
        <ul className={s.milestoneList} aria-label="Milestones">
          {goal.milestones.map((m) => (
            <li key={m._id} className={m.doneAt !== null ? s.done : undefined}>
              {m.doneAt !== null ? <s>{m.title}</s> : m.title}
              <span className={s.sr}>
                {m.doneAt !== null ? "Done" : "To do"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {linked.map((task) => (
        <TaskRow {...p} task={task} withDate linked key={task._id} />
      ))}
      {!linked.length && (
        <p>No linked tasks yet. Open a task and choose this goal.</p>
      )}
    </section>
  );
}
