import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toTaskItem } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { createTaskSchema } from "@/lib/validators";
import { TaskModel } from "@/models/Task";

function parseOptionalDate(value?: string) {
  if (!value || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(request: Request) {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const userId = new Types.ObjectId(user.id);
  const searchParams = new URL(request.url).searchParams;

  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const query: Record<string, unknown> = { userId };

  if (status === "completed") {
    query.completed = true;
  } else if (status === "open") {
    query.completed = false;
  } else if (status === "in_progress") {
    query.status = "in_progress";
  }

  if (categoryId && categoryId !== "all" && Types.ObjectId.isValid(categoryId)) {
    query.categoryId = new Types.ObjectId(categoryId);
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ title: regex }, { description: regex }];
  }

  const tasks = await TaskModel.find(query).sort({ sortOrder: 1, createdAt: 1 });
  return NextResponse.json({ tasks: tasks.map(toTaskItem) });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createTaskSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid task payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const dueDate = parseOptionalDate(parsed.data.dueDate);
    if (parsed.data.dueDate && !dueDate) {
      return NextResponse.json({ error: "Invalid due date value." }, { status: 400 });
    }

    await connectToDatabase();
    const userId = new Types.ObjectId(user.id);

    const lastTask = await TaskModel.findOne({ userId }).sort({ sortOrder: -1 }).select("sortOrder");
    const nextSortOrder = (lastTask?.sortOrder ?? -1) + 1;

    const status = parsed.data.status ?? "todo";
    const completed = status === "done";

    const task = await TaskModel.create({
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      dueDate,
      priority: parsed.data.priority ?? "medium",
      categoryId:
        parsed.data.categoryId && Types.ObjectId.isValid(parsed.data.categoryId)
          ? new Types.ObjectId(parsed.data.categoryId)
          : null,
      reminderMinutes: parsed.data.reminderMinutes ?? null,
      status,
      completed,
      completedAt: completed ? new Date() : null,
      sortOrder: nextSortOrder,
    });

    return NextResponse.json(
      {
        message: "Task created.",
        task: toTaskItem(task),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Task create error:", error);
    return NextResponse.json({ error: "Unable to create task." }, { status: 500 });
  }
}
