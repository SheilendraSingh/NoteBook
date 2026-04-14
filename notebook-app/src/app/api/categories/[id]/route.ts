import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toTaskCategory } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { updateCategorySchema } from "@/lib/validators";
import { CategoryModel } from "@/models/Category";
import { TaskModel } from "@/models/Task";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
    }

    const payload = await request.json();
    const parsed = updateCategorySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid category payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    if (parsed.data.color !== undefined) {
      updateData.color = parsed.data.color;
    }

    const category = await CategoryModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(user.id),
      },
      updateData,
      { new: true },
    );

    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Category updated.",
      category: toTaskCategory(category),
    });
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json({ error: "Unable to update category." }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
    }

    await connectToDatabase();
    const userId = new Types.ObjectId(user.id);
    const categoryId = new Types.ObjectId(id);

    await TaskModel.updateMany(
      { userId, categoryId },
      {
        $set: {
          categoryId: null,
        },
      },
    );

    const result = await CategoryModel.findOneAndDelete({ _id: categoryId, userId });

    if (!result) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Category deleted." });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json({ error: "Unable to delete category." }, { status: 500 });
  }
}
