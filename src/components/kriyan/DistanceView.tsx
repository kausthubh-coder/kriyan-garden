import type { Horizon, Region, Task } from "@/lib/types";
import { TaskStone } from "./TaskStone";
import styles from "./kriyan.module.css";

const bands: Array<{ id: Horizon; label: string; color: string }> = [
  { id: "someday", label: "someday", color: "#8e8a7d" },
  { id: "season", label: "this season", color: "#637b54" },
  { id: "now", label: "now", color: "#bb6546" },
];

export function DistanceView({ regions, tasks, onOpen }: { regions: Region[]; tasks: Task[]; onOpen: (id: string) => void }) {
  const regionMap = new Map(regions.map((region) => [region.id, region]));
  return (
    <main className={styles.distanceView}>
      {bands.map((band) => {
        const bandTasks = tasks.filter((task) => task.status === "active" && task.horizon === band.id);
        return (
          <section className={`${styles.distanceBand} ${styles[`${band.id}Band`]}`} key={band.id}>
            <h2><span style={{ background: band.color }} />{band.label}</h2>
            <div className={styles.bandTasks}>
              {bandTasks.map((task) => (
                <TaskStone
                  key={task.id}
                  task={task}
                  region={{
                    id: task.regionId ?? band.id,
                    name: task.regionId ? regionMap.get(task.regionId)?.name ?? band.label : band.label,
                    color: band.color,
                    note: "",
                    sortOrder: 0,
                  }}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
