import { Types } from "mongoose";

import { CategoryModel } from "@/models/Category";

const STARTER_CATEGORIES = [
  { name: "Personal", color: "#2d7f5e" },
  { name: "Work", color: "#2563eb" },
  { name: "Study", color: "#7c3aed" },
];

export async function ensureUserHasDefaultCategories(userId: string | Types.ObjectId) {
  const normalizedUserId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const existingCount = await CategoryModel.countDocuments({ userId: normalizedUserId });

  if (existingCount > 0) {
    return;
  }

  await CategoryModel.insertMany(
    STARTER_CATEGORIES.map((category) => ({
      userId: normalizedUserId,
      ...category,
    })),
  );
}
