import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
      });
    }

    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: { username: username.toLowerCase() },
    });

    return NextResponse.json({
      available: !existingUser,
      username: username.toLowerCase(),
    });
  } catch (error) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
