import { Types } from "mongoose";

import { getAuthenticatedUserId } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { toUserProfile } from "@/lib/serializers";
import { UserModel } from "@/models/User";

export async function getCurrentUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(userId);

  if (!user) {
    return null;
  }

  return toUserProfile(user);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}
