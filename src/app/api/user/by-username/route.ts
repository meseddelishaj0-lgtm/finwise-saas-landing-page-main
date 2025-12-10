// api/user/by-username/route.ts
// Get user by username
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/by-username?username=testuser
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        profileImage: true,
        karma: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
