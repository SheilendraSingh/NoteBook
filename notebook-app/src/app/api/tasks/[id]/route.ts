import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toTaskItem } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { updateTaskSchema } from "@/lib/validators";
import { TaskModel } from "@/models/Task";

type Context = {
  params: Promise<{ id: string }>;
};

function parseDueDate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
    }

    const payload = await request.json();
    const parsed = updateTaskSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid task payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const dueDate = parseDueDate(parsed.data.dueDate);
    if (dueDate === "invalid") {
      return NextResponse.json({ error: "Invalid due date value." }, { status: 400 });
    }

    await connectToDatabase();
    const userId = new Types.ObjectId(user.id);
    const taskId = new Types.ObjectId(id);

    const existingTask = await TaskModel.findOne({ _id: taskId, userId });
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title;
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (parsed.data.priority !== undefined) {
      updateData.priority = parsed.data.priority;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate;
    }

    if (parsed.data.categoryId !== undefined) {
      updateData.categoryId =
        parsed.data.categoryId && Types.ObjectId.isValid(parsed.data.categoryId)
          ? new Types.ObjectId(parsed.data.categoryId)
          : null;
    }

    if (parsed.data.reminderMinutes !== undefined) {
      updateData.reminderMinutes = parsed.data.reminderMinutes;
    }

    if (parsed.data.completed !== undefined) {
      updateData.completed = parsed.data.completed;
      updateData.status = parsed.data.completed ? "done" : "todo";
      updateData.completedAt = parsed.data.completed ? new Date() : null;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;

      if (parsed.data.status === "done") {
        updateData.completed = true;
        updateData.completedAt = existingTask.completedAt ?? new Date();
      } else if (parsed.data.completed === undefined) {
        updateData.completed = false;
        updateData.completedAt = null;
      }
    }

    const updatedTask = await TaskModel.findOneAndUpdate({ _id: taskId, userId }, updateData, {
      new: true,
    });

    if (!updatedTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Task updated.",
      task: toTaskItem(updatedTask),
    });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: "Unable to update task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
    }

    await connectToDatabase();
    const result = await TaskModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(user.id),
    });

    if (!result) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted." });
  } catch (error) {
    console.error("Task delete error:", error);
    return NextResponse.json({ error: "Unable to delete task." }, { status: 500 });
  }
}
