import { NextResponse } from "next/server";

import { createAuthToken, setAuthCookie, verifyPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { toUserProfile } from "@/lib/serializers";
import { loginSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login input.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const user = await UserModel.findOne({ email: parsed.data.email });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createAuthToken(user._id.toString());
    await setAuthCookie(token);

    return NextResponse.json({
      message: "Login successful.",
      user: toUserProfile(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Unable to login right now." }, { status: 500 });
  }
}
