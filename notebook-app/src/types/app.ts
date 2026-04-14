export type ThemePreference = "system" | "light" | "dark";

export type TaskPriority = "low" | "medium" | "high";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  reminderLeadMinutes: number;
  themePreference: ThemePreference;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  reminderMinutes: number | null;
  categoryId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
