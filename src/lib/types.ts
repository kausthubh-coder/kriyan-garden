export type Horizon = "now" | "season" | "someday";
export type TaskStatus = "active" | "completed";

export interface Region {
  id: string;
  name: string;
  color: string;
  note: string;
  sortOrder: number;
}

export interface Task {
  id: string;
  title: string;
  regionId: string | null;
  horizon: Horizon;
  dueDate: string | null;
  time: string | null;
  durationMinutes: number | null;
  repeatRule: string | null;
  reminders: string[];
  content: string;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskSummary = Omit<Task, "content">;

export interface GardenData {
  regions: Region[];
  tasks: TaskSummary[];
  onboardingComplete: boolean;
}

export interface RegionDraft {
  name: string;
}

export interface TaskDraft {
  title: string;
  regionId: string | null;
  dueDate?: string | null;
  time?: string | null;
  durationMinutes?: number | null;
  repeatRule?: string | null;
  reminders?: string[];
  content?: string;
}

export type TaskPatch = Partial<TaskDraft>;
