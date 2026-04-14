import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toTaskItem } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { reorderTasksSchema } from "@/lib/validators";
import { TaskModel } from "@/models/Task";

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = reorderTasksSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reorder payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (!parsed.data.orderedIds.every((id) => Types.ObjectId.isValid(id))) {
      return NextResponse.json({ error: "One or more task ids are invalid." }, { status: 400 });
    }

    await connectToDatabase();
    const userId = new Types.ObjectId(user.id);
    const orderedObjectIds = parsed.data.orderedIds.map((id) => new Types.ObjectId(id));
    const matchingTasksCount = await TaskModel.countDocuments({
      _id: { $in: orderedObjectIds },
      userId,
    });

    if (matchingTasksCount !== orderedObjectIds.length) {
      return NextResponse.json({ error: "Task list includes unavailable ids." }, { status: 400 });
    }

    await TaskModel.bulkWrite(
      orderedObjectIds.map((taskId, index) => ({
        updateOne: {
          filter: { _id: taskId, userId },
          update: { sortOrder: index },
        },
      })),
    );

    const tasks = await TaskModel.find({ userId }).sort({ sortOrder: 1, createdAt: 1 });

    return NextResponse.json({
      message: "Task order updated.",
      tasks: tasks.map(toTaskItem),
    });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Unable to reorder tasks." }, { status: 500 });
  }
}
