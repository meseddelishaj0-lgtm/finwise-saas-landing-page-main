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

      // Debug: Count total follows for this user
      const followCount = await prisma.follow.count({
        where: { followerId: currentUserId },
      });

      // Debug: Get ALL follows involving this user
      const allFollows = await prisma.follow.findMany({
        where: {
          OR: [
            { followerId: currentUserId },
            { followingId: currentUserId },
          ],
        },
        take: 10,
      });
      console.log(`👥 User ${currentUserId} follows (${followCount}):`, followingIds);
      console.log(`👥 All follows involving user ${currentUserId}:`, allFollows);
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

    // Temporarily include debug info
    // Get all follows to debug
    const debugFollows = currentUserId ? await prisma.follow.findMany({
      where: {
        OR: [
          { followerId: currentUserId },
          { followingId: currentUserId },
        ],
      },
      take: 10,
    }) : [];

    return NextResponse.json({
      users: usersWithFollowState,
      debug: {
        currentUserId,
        followingIds,
        allFollowsForUser: debugFollows,
      }
    }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching suggested users:", err);
    return NextResponse.json({ error: "Failed to load suggested users" }, { status: 500 });
  }
}
