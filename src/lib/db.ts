import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { GardenData, Horizon, Region, Task, TaskDraft, TaskPatch } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), ".data");
const databasePath = path.join(dataDirectory, "kriyan.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    horizon TEXT NOT NULL CHECK (horizon IN ('now', 'season', 'someday')),
    due_date TEXT,
    time TEXT,
    duration_minutes INTEGER,
    repeat_rule TEXT,
    reminders TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    completed_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const regionColors = ["#637b54", "#bb6546", "#c5a04f", "#8a7c6c", "#6f7784", "#8a6f86"];

const seedRegions: Region[] = [
  { id: "kitchen", name: "Kitchen", color: "#637b54", note: "A quiet bed.", sortOrder: 0 },
  { id: "house", name: "The house", color: "#bb6546", note: "Rooms worth tending.", sortOrder: 1 },
  { id: "letters", name: "Letters", color: "#8a7c6c", note: "Words kept close.", sortOrder: 2 },
  { id: "studio", name: "Studio", color: "#c5a04f", note: "Work with room around it.", sortOrder: 3 },
  { id: "rest", name: "Rest", color: "#8e8a7d", note: "Nothing planted.", sortOrder: 4 },
];

const saturdayLetter = `
  <p>Mira, after the move. Keep it short. She reads these on the train.</p>
  <p>The kitchen is finally quiet. The leak is a story now, not a crisis.</p>
  <ul data-type="taskList">
    <li>Ask about October, the spare room is ready</li>
    <li>Mention the bread from the corner place</li>
    <li>No apology for the delay</li>
  </ul>
  <p>Send before noon so it lands with Saturday coffee. Trains and the spare room live on <a href="#october-visit">The October visit</a>.</p>
`;

const seedTasks: Array<TaskDraft & { id: string; sortOrder: number }> = [
  { id: "cilantro", title: "Buy cilantro and limes", regionId: "kitchen", horizon: "now", dueDate: "2026-08-24", time: "08:00", durationMinutes: 20, reminders: ["07:45"], content: "<p>For the green sauce. Two bunches, if they look good.</p>", sortOrder: 0 },
  { id: "knives", title: "Sharpen the knives", regionId: "kitchen", horizon: "now", content: "<p>Take the small whetstone from the second drawer.</p>", sortOrder: 1 },
  { id: "cabbage", title: "Ferment the cabbage", regionId: "kitchen", horizon: "season", dueDate: "2026-08-29", repeatRule: "every month", content: "<p>Salt by weight. Leave one jar plain.</p>", sortOrder: 2 },
  { id: "stoneware", title: "Order the stoneware bowls", regionId: "kitchen", horizon: "someday", content: "<p>Six low bowls in the warm gray glaze.</p>", sortOrder: 3 },
  { id: "shelves", title: "Wipe the open shelves", regionId: "kitchen", horizon: "season", content: "<p>Move the jars first. Lemon oil is under the sink.</p>", sortOrder: 4 },
  { id: "bulbs", title: "Plant the autumn bulbs", regionId: "kitchen", horizon: "someday", dueDate: "2026-09-12", content: "<p>Tulips behind the thyme. Daffodils near the path.</p>", sortOrder: 5 },
  { id: "hinge", title: "Oil the front-door hinge", regionId: "house", horizon: "now", content: "<p>The top hinge is the loud one.</p>", sortOrder: 6 },
  { id: "chimney", title: "Book the chimney sweep", regionId: "house", horizon: "season", dueDate: "2026-09-03", reminders: ["09:00"], content: "<p>Ask whether they can also check the cap.</p>", sortOrder: 7 },
  { id: "spare-room", title: "Replaster the spare room", regionId: "house", horizon: "someday", content: "<p>The west wall first. Match the old lime finish.</p>", sortOrder: 8 },
  { id: "landlord", title: "Call the landlord about the leak", regionId: "house", horizon: "now", dueDate: "2026-08-24", time: "10:30", reminders: ["10:15"], content: "<p>Kitchen ceiling, near the north window. Photos are in the camera roll.</p>", sortOrder: 9 },
  { id: "mira", title: "Write Mira back", regionId: "letters", horizon: "now", dueDate: "2026-08-24", content: "<p>Tell her October works. Ask about the early train.</p>", sortOrder: 10 },
  { id: "saturday-letter", title: "Draft the Saturday letter", regionId: "letters", horizon: "season", dueDate: "2026-08-29", time: "08:00", durationMinutes: 45, repeatRule: "every Saturday after 8", reminders: ["Saturday 08:00", "Friday 18:00"], content: saturdayLetter, sortOrder: 11 },
  { id: "weekend", title: "A weekend with Mira", regionId: "letters", horizon: "someday", content: "<p>A loose list for when the dates become real.</p>", sortOrder: 12 },
  { id: "linen", title: "Stretch the linen", regionId: "studio", horizon: "season", content: "<p>Use the long wall. Steam the fold before pinning.</p>", sortOrder: 13 },
  { id: "ground", title: "Mix a warmer ground", regionId: "studio", horizon: "season", dueDate: "2026-08-26", content: "<p>More ochre, less umber. Keep one cool sample beside it.</p>", sortOrder: 14 },
  { id: "still-life", title: "Photograph the small still life", regionId: "studio", horizon: "season", dueDate: "2026-08-28", durationMinutes: 60, content: "<p>Morning window. Use the linen and the shallow bowl.</p>", sortOrder: 15 },
  { id: "mend-linen", title: "Learn to mend the linen", regionId: "studio", horizon: "someday", content: "<p>Start with the torn napkin. Invisible stitch notes live here.</p>", sortOrder: 16 },
];

function seedIfEmpty() {
  const regionCount = database.prepare("SELECT COUNT(*) AS count FROM regions").get() as { count: number };
  if (regionCount.count > 0) return;
  const insertRegion = database.prepare("INSERT INTO regions (id, name, color, note, sort_order) VALUES (@id, @name, @color, @note, @sortOrder)");
  const insertTask = database.prepare(`
    INSERT INTO tasks (
      id, title, region_id, horizon, due_date, time, duration_minutes, repeat_rule,
      reminders, content, status, completed_at, sort_order, created_at, updated_at
    ) VALUES (
      @id, @title, @regionId, @horizon, @dueDate, @time, @durationMinutes, @repeatRule,
      @reminders, @content, 'active', NULL, @sortOrder, @createdAt, @updatedAt
    )
  `);
  database.transaction(() => {
    for (const region of seedRegions) insertRegion.run(region);
    const timestamp = new Date("2026-08-24T08:00:00.000Z").toISOString();
    for (const task of seedTasks) {
      insertTask.run({
        ...task,
        dueDate: task.dueDate ?? null,
        time: task.time ?? null,
        durationMinutes: task.durationMinutes ?? null,
        repeatRule: task.repeatRule ?? null,
        reminders: JSON.stringify(task.reminders ?? []),
        content: task.content ?? "",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  })();
}

type TaskRow = {
  id: string; title: string; region_id: string | null; horizon: Horizon; due_date: string | null;
  time: string | null; duration_minutes: number | null; repeat_rule: string | null; reminders: string;
  content: string; status: "active" | "completed"; completed_at: string | null; sort_order: number;
  created_at: string; updated_at: string;
};

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    regionId: row.region_id,
    horizon: row.horizon,
    dueDate: row.due_date,
    time: row.time,
    durationMinutes: row.duration_minutes,
    repeatRule: row.repeat_rule,
    reminders: JSON.parse(row.reminders) as string[],
    content: row.content,
    status: row.status,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getGardenData(): GardenData {
  const regions = database.prepare("SELECT id, name, color, note, sort_order AS sortOrder FROM regions ORDER BY sort_order ASC").all() as Region[];
  const rows = database.prepare("SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC").all() as TaskRow[];
  const setting = database.prepare("SELECT value FROM settings WHERE key = 'onboarding_complete'").get() as { value: string } | undefined;
  return { regions, tasks: rows.map(taskFromRow), onboardingComplete: setting?.value === "1" };
}

export function completeOnboardingRecord(names: string[]): GardenData {
  const insertRegion = database.prepare("INSERT INTO regions (id, name, color, note, sort_order) VALUES (?, ?, ?, '', ?)");
  database.transaction(() => {
    database.prepare("DELETE FROM tasks").run();
    database.prepare("DELETE FROM regions").run();
    names.forEach((name, index) => insertRegion.run(crypto.randomUUID(), name, regionColors[index % regionColors.length], index));
    database.prepare("INSERT INTO settings (key, value) VALUES ('onboarding_complete', '1') ON CONFLICT(key) DO UPDATE SET value = '1'").run();
  })();
  return getGardenData();
}

export function loadDemoWorkspaceRecord(): GardenData {
  database.transaction(() => {
    database.prepare("DELETE FROM tasks").run();
    database.prepare("DELETE FROM regions").run();
  })();
  seedIfEmpty();
  database.prepare("INSERT INTO settings (key, value) VALUES ('onboarding_complete', '1') ON CONFLICT(key) DO UPDATE SET value = '1'").run();
  return getGardenData();
}

export function restartOnboardingRecord(): GardenData {
  database.transaction(() => {
    database.prepare("DELETE FROM tasks").run();
    database.prepare("DELETE FROM regions").run();
    database.prepare("INSERT INTO settings (key, value) VALUES ('onboarding_complete', '0') ON CONFLICT(key) DO UPDATE SET value = '0'").run();
  })();
  return getGardenData();
}

export function createRegionRecord(name: string): Region {
  const id = crypto.randomUUID();
  const max = database.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM regions").get() as { max: number };
  const sortOrder = max.max + 1;
  const region: Region = { id, name, color: regionColors[sortOrder % regionColors.length], note: "Nothing planted.", sortOrder };
  database.prepare("INSERT INTO regions (id, name, color, note, sort_order) VALUES (@id, @name, @color, @note, @sortOrder)").run(region);
  return region;
}

export function updateRegionRecord(id: string, name: string): Region {
  const result = database.prepare("UPDATE regions SET name = ? WHERE id = ?").run(name, id);
  if (result.changes === 0) throw new Error("Space not found");
  return database.prepare("SELECT id, name, color, note, sort_order AS sortOrder FROM regions WHERE id = ?").get(id) as Region;
}

export function deleteRegionRecord(id: string): void {
  const count = database.prepare("SELECT COUNT(*) AS count FROM regions").get() as { count: number };
  if (count.count <= 1) throw new Error("Keep at least one space.");
  const result = database.prepare("DELETE FROM regions WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("Space not found");
}

export function getTaskRecord(id: string): Task {
  const row = database.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  if (!row) throw new Error("Task not found");
  return taskFromRow(row);
}

export function createTaskRecord(draft: TaskDraft): Task {
  const timestamp = new Date().toISOString();
  const id = crypto.randomUUID();
  const max = database.prepare("SELECT COALESCE(MAX(sort_order), 0) AS max FROM tasks").get() as { max: number };
  database.prepare(`
    INSERT INTO tasks (
      id, title, region_id, horizon, due_date, time, duration_minutes, repeat_rule,
      reminders, content, status, completed_at, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?, ?)
  `).run(id, draft.title, draft.regionId, draft.horizon, draft.dueDate ?? null, draft.time ?? null,
    draft.durationMinutes ?? null, draft.repeatRule ?? null, JSON.stringify(draft.reminders ?? []),
    draft.content ?? "", max.max + 1, timestamp, timestamp);
  return getTaskRecord(id);
}

export function updateTaskRecord(id: string, patch: TaskPatch): Task {
  const allowed = new Map<string, string>([
    ["title", "title"], ["regionId", "region_id"], ["horizon", "horizon"], ["dueDate", "due_date"],
    ["time", "time"], ["durationMinutes", "duration_minutes"], ["repeatRule", "repeat_rule"],
    ["reminders", "reminders"], ["content", "content"],
  ]);
  const entries = Object.entries(patch).filter(([key]) => allowed.has(key));
  if (entries.length === 0) return getTaskRecord(id);
  const assignments = entries.map(([key]) => `${allowed.get(key)} = @${key}`);
  const params: Record<string, unknown> = { id, updatedAt: new Date().toISOString() };
  for (const [key, value] of entries) params[key] = key === "reminders" ? JSON.stringify(value ?? []) : value ?? null;
  database.prepare(`UPDATE tasks SET ${assignments.join(", ")}, updated_at = @updatedAt WHERE id = @id`).run(params);
  return getTaskRecord(id);
}

export function setTaskCompletion(id: string, completed: boolean): Task {
  const timestamp = new Date().toISOString();
  database.prepare("UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
    .run(completed ? "completed" : "active", completed ? timestamp : null, timestamp, id);
  return getTaskRecord(id);
}
