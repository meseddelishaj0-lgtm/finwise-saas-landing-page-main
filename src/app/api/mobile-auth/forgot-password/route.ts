import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log("Forgot password request:", { email });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, a reset code has been sent.",
      });
    }

    // Generate 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code in database
    await prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetCodeExpiry: resetExpiry,
      },
    });

    // Send email with Resend
    try {
      await sendPasswordResetEmail(email, resetCode);
      console.log(`Reset code sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the request if email fails - user can retry
    }

    return NextResponse.json({
      message: "If an account exists with this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
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
