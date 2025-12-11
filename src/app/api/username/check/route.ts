import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/username/check?username=xxx - Check if username is available
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3-20 characters, lowercase letters, numbers, and underscores only"
      });
    }

    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive'
        }
      }
    });

    return NextResponse.json({
      available: !existingUser,
      username
    });
  } catch (err) {
    console.error("Error checking username:", err);
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
  }
}
