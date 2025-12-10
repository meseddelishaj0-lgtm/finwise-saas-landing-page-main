import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    console.log("Reset password request:", { email, code });

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid reset code" },
        { status: 400 }
      );
    }

    // Check reset code
    if (user.resetCode !== code) {
      return NextResponse.json(
        { error: "Invalid reset code" },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return NextResponse.json(
        { error: "Reset code has expired" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset code
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    console.log("Password reset successful for:", user.id);

    // Create JWT token to auto-login
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      message: "Password reset successful",
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
