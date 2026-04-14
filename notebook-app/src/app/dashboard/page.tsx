import { Types } from "mongoose";
import { redirect } from "next/navigation";

import { TaskDashboard } from "@/components/task-dashboard";
import { ensureUserHasDefaultCategories } from "@/lib/default-categories";
import { connectToDatabase } from "@/lib/mongodb";
import { toTaskCategory, toTaskItem } from "@/lib/serializers";
import { getCurrentUser } from "@/lib/session";
import { CategoryModel } from "@/models/Category";
import { TaskModel } from "@/models/Task";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectToDatabase();
  const userId = new Types.ObjectId(user.id);
  await ensureUserHasDefaultCategories(userId);

  const [tasks, categories] = await Promise.all([
    TaskModel.find({ userId }).sort({ sortOrder: 1, createdAt: 1 }),
    CategoryModel.find({ userId }).sort({ createdAt: 1 }),
  ]);

  return (
    <TaskDashboard
      initialUser={user}
      initialTasks={tasks.map(toTaskItem)}
      initialCategories={categories.map(toTaskCategory)}
    />
  );
}
