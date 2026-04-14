import { NextResponse } from "next/server";

import { createAuthToken, hashPassword, setAuthCookie } from "@/lib/auth";
import { ensureUserHasDefaultCategories } from "@/lib/default-categories";
import { connectToDatabase } from "@/lib/mongodb";
import { toUserProfile } from "@/lib/serializers";
import { registerSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration input.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const existingUser = await UserModel.findOne({ email: parsed.data.email }).select("_id");

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await UserModel.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      reminderLeadMinutes: 120,
      themePreference: "system",
    });
    await ensureUserHasDefaultCategories(user._id);

    const token = await createAuthToken(user._id.toString());
    await setAuthCookie(token);

    return NextResponse.json(
      {
        message: "Registration successful.",
        user: toUserProfile(user),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Unable to register right now." }, { status: 500 });
  }
}
