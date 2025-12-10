import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/blocked - Get users blocked by the current user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const currentUserId = parseInt(userId, 10);

    const blockedUsers = await prisma.block.findMany({
      where: {
        blockerId: currentUserId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to return user data directly
    const users = blockedUsers.map((block) => ({
      id: block.blocked.id,
      name: block.blocked.name,
      email: block.blocked.email,
      profileImage: block.blocked.profileImage,
      blockedAt: block.createdAt,
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching blocked users:", err);
    return NextResponse.json({ error: "Failed to load blocked users" }, { status: 500 });
  }
}
