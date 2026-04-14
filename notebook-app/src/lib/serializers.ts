import type { CategoryDocument } from "@/models/Category";
import type { TaskDocument } from "@/models/Task";
import type { UserDocument } from "@/models/User";
import type { TaskCategory, TaskItem, UserProfile } from "@/types/app";

export function toUserProfile(user: UserDocument): UserProfile {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    reminderLeadMinutes: user.reminderLeadMinutes,
    themePreference: user.themePreference,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toTaskCategory(category: CategoryDocument): TaskCategory {
  return {
    id: category._id.toString(),
    name: category.name,
    color: category.color,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function toTaskItem(task: TaskDocument): TaskItem {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    completed: task.completed,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    reminderMinutes: task.reminderMinutes,
    categoryId: task.categoryId ? task.categoryId.toString() : null,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
