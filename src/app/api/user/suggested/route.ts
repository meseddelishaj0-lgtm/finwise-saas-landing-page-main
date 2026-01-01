import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/suggested - Get suggested users to follow
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const currentUserId = userId ? parseInt(userId, 10) : null;

    // Get blocked users to exclude
    let blockedIds: number[] = [];
    let followingIds: number[] = [];

    if (currentUserId) {
      // Get blocked users
      const blocked = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: currentUserId },
            { blockedId: currentUserId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });

      blocked.forEach(b => {
        blockedIds.push(b.blockerId, b.blockedId);
      });

      // Get users being followed (to mark isFollowing)
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });

      followingIds = following.map(f => f.followingId);
    }

    // Exclude only self and blocked users (NOT followed users)
    const excludeIds = currentUserId
      ? [currentUserId, ...blockedIds]
      : blockedIds;

    // Get active users with most followers/posts
    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: excludeIds.length > 0 ? excludeIds : undefined,
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        profileImage: true,
        subscriptionTier: true,
        _count: {
          select: {
            posts: true,
            followers: true,
          },
        },
      },
      orderBy: [
        { followers: { _count: 'desc' } },
        { posts: { _count: 'desc' } },
      ],
      take: limit,
    });

    // Add isFollowing state for each user
    const usersWithFollowState = users.map(user => ({
      ...user,
      isFollowing: followingIds.includes(user.id),
    }));

    return NextResponse.json(usersWithFollowState, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching suggested users:", err);
    return NextResponse.json({ error: "Failed to load suggested users" }, { status: 500 });
  }
}
