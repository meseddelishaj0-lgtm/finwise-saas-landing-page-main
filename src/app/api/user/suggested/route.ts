import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export const dynamic = 'force-dynamic';

// Create a fresh connection for each request to ensure no stale data
function createFreshPrisma() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// GET /api/user/suggested - Get suggested users to follow
export async function GET(req: NextRequest) {
  // Create fresh client to avoid stale reads
  const prisma = createFreshPrisma();

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

      // Get users being followed using raw query to bypass any caching
      const followingRaw = await prisma.$queryRaw<{ followingId: number }[]>`
        SELECT "followingId" FROM "Follow" WHERE "followerId" = ${currentUserId}
      `;

      followingIds = followingRaw.map(f => f.followingId);
      console.log(`👥 User ${currentUserId} following (raw):`, followingIds);
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

    // Debug: Include raw followingIds in response
    const response = NextResponse.json({
      users: usersWithFollowState,
      _debug: { followingIds, currentUserId }
    }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Cleanup
    await prisma.$disconnect();
    return response;
  } catch (err) {
    console.error("❌ Error fetching suggested users:", err);
    await prisma.$disconnect();
    return NextResponse.json({ error: "Failed to load suggested users" }, { status: 500 });
  }
}
