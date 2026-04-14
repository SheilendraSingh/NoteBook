import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toTaskCategory } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { createCategorySchema } from "@/lib/validators";
import { CategoryModel } from "@/models/Category";

const DEFAULT_COLORS = ["#2d7f5e", "#2563eb", "#7c3aed", "#f97316", "#dc2626", "#0891b2"];

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const categories = await CategoryModel.find({ userId: new Types.ObjectId(user.id) }).sort({
    createdAt: 1,
  });

  return NextResponse.json({ categories: categories.map(toTaskCategory) });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createCategorySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid category payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const color = parsed.data.color ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    const category = await CategoryModel.create({
      userId: new Types.ObjectId(user.id),
      name: parsed.data.name,
      color,
    });

    return NextResponse.json(
      {
        message: "Category created.",
        category: toTaskCategory(category),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Category create error:", error);
    return NextResponse.json({ error: "Unable to create category." }, { status: 500 });
  }
}
