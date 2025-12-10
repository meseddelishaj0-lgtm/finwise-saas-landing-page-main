import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/:id - Get user profile
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        profileImage: true,
        bannerImage: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if current user is following this user (if userId is provided in query)
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get("currentUserId");
    
    let isFollowing = false;
    if (currentUserId) {
      const follow = await prisma.follow.findFirst({
        where: {
          followerId: parseInt(currentUserId, 10),
          followingId: userId,
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      ...user,
      isFollowing,
    }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
