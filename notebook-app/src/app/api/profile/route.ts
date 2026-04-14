import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { toUserProfile } from "@/lib/serializers";
import { requireCurrentUser } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = updateProfileSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    if (parsed.data.email !== undefined) {
      const duplicate = await UserModel.findOne({
        email: parsed.data.email,
        _id: { $ne: new Types.ObjectId(currentUser.id) },
      }).select("_id");

      if (duplicate) {
        return NextResponse.json({ error: "This email address is already in use." }, { status: 409 });
      }

      updateData.email = parsed.data.email;
    }

    if (parsed.data.reminderLeadMinutes !== undefined) {
      updateData.reminderLeadMinutes = parsed.data.reminderLeadMinutes;
    }

    if (parsed.data.themePreference !== undefined) {
      updateData.themePreference = parsed.data.themePreference;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(currentUser.id, updateData, { new: true });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Profile updated.",
      user: toUserProfile(updatedUser),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
