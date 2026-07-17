// src/app/api/mobile-auth/change-password/route.ts
// Change password for a signed-in user: verify the current password, then set a
// new bcrypt hash. Replaces the app's old fake setTimeout "success" that never
// changed anything (users thought their password changed and got locked out).
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "change-password", 10, 60_000);
  if (limited) return limited;

  try {
    const { userId, currentPassword, newPassword } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const id = parseInt(String(userId), 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, password: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.password) {
      // Google/Apple account with no password set
      return NextResponse.json(
        { error: "This account signs in with Google or Apple and has no password to change." },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
