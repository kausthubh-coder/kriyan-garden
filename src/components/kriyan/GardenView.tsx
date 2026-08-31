import { Plus } from "@phosphor-icons/react";
import type { Region, Task } from "@/lib/types";
import { TaskStone } from "./TaskStone";
import styles from "./kriyan.module.css";

export function GardenView({ regions, tasks, onOpen, onManageSpaces }: { regions: Region[]; tasks: Task[]; onOpen: (id: string) => void; onManageSpaces: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTasks = tasks.filter((task) => task.status === "active" && task.dueDate === today);
  const plantedTasks = tasks.filter((task) => task.status === "active" && task.dueDate !== today);
  const regionMap = new Map(regions.map((region) => [region.id, region]));
  const unsortedTasks = plantedTasks.filter((task) => !task.regionId || !regionMap.has(task.regionId));
  const visibleRegions = unsortedTasks.length > 0
    ? [...regions, { id: "__unsorted", name: "Unsorted", color: "#8e8a7d", note: "A quiet place for loose todos.", sortOrder: regions.length }]
    : regions;

  function renderPlot(region: Region) {
    const regionTasks = region.id === "__unsorted" ? unsortedTasks : plantedTasks.filter((task) => task.regionId === region.id);
    return (
      <section className={styles.plot} key={region.id}>
        <h2><span style={{ background: region.color }} />{region.name}</h2>
        {regionTasks.length > 0 ? (
          <div className={styles.plotTasks}>
            {regionTasks.map((task) => <TaskStone key={task.id} task={task} region={region} onOpen={onOpen} />)}
          </div>
        ) : <p className={styles.emptyPlot}>nothing planted</p>}
      </section>
    );
  }

  return (
    <main className={styles.gardenView}>
      <div className={styles.plotRow}>{visibleRegions.slice(0, 2).map(renderPlot)}</div>
      <section className={styles.todayPath} aria-label="Today">
        <span className={styles.todayLabel}>today</span>
        <div className={styles.dashedPath} aria-hidden="true" />
        <div className={styles.todayTasks}>
          {nowTasks.map((task) => <TaskStone key={task.id} task={task} region={task.regionId ? regionMap.get(task.regionId) : undefined} onOpen={onOpen} />)}
        </div>
      </section>
      {visibleRegions.length > 2 ? <div className={styles.plotGrid}>{visibleRegions.slice(2).map(renderPlot)}</div> : null}
      {visibleRegions.length === 0 ? (
        <section className={styles.emptyGarden}>
          <h1>Your garden is quiet.</h1>
          <p>Add a space first, then give the work somewhere to live.</p>
        </section>
      ) : null}
      <button className={styles.newSpaceButton} type="button" onClick={onManageSpaces}><Plus size={15} weight="thin" />new space</button>
    </main>
  );
}
