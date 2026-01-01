import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/suggested - Get suggested users to follow
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Get users that the current user is not following
    let excludeIds: number[] = [];
    
    if (userId) {
      const currentUserId = parseInt(userId, 10);
      excludeIds.push(currentUserId);
      
      // Get users already being followed
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      
      excludeIds.push(...following.map(f => f.followingId));
      
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
        excludeIds.push(b.blockerId, b.blockedId);
      });
    }

    // Get active users with most followers/posts
    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: excludeIds,
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

    // Add isFollowing: false since we excluded followed users
    const usersWithFollowState = users.map(user => ({
      ...user,
      isFollowing: false,
    }));

    return NextResponse.json(usersWithFollowState, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching suggested users:", err);
    return NextResponse.json({ error: "Failed to load suggested users" }, { status: 500 });
  }
}
