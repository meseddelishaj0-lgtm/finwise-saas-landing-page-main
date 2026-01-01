import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@/generated/prisma/client/client";
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

    // Use a SINGLE transaction for ALL queries to ensure data consistency
    // This prevents stale reads from different connections
    const usersWithFollowState = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1`; // Force primary connection

      // Get blocked users to exclude
      let blockedIds: number[] = [];
      let followingIds: number[] = [];

      if (currentUserId) {
        // Get blocked users (inside transaction)
        const blocked = await tx.$queryRaw<{ blockerId: number; blockedId: number }[]>`
          SELECT "blockerId", "blockedId" FROM "Block"
          WHERE "blockerId" = ${currentUserId} OR "blockedId" = ${currentUserId}
        `;

        blocked.forEach(b => {
          blockedIds.push(b.blockerId, b.blockedId);
        });

        // Get users being followed (inside transaction for consistency)
        const followingRaw = await tx.$queryRaw<{ followingId: number }[]>`
          SELECT "followingId" FROM "Follow" WHERE "followerId" = ${currentUserId}
        `;

        followingIds = followingRaw.map(f => f.followingId);
        console.log(`👥 User ${currentUserId} following (raw, in txn):`, followingIds);
      }

      // Exclude only self and blocked users (NOT followed users)
      const excludeIds = currentUserId
        ? [currentUserId, ...blockedIds]
        : blockedIds;

      // Raw SQL query to get users with follower counts
      const rawUsers = await tx.$queryRaw<any[]>`
        SELECT
          u.id,
          u.name,
          u.username,
          u.email,
          u."profileImage",
          u."subscriptionTier",
          (SELECT COUNT(*) FROM "Follow" WHERE "followingId" = u.id) as "followerCount",
          (SELECT COUNT(*) FROM "Post" WHERE "userId" = u.id) as "postCount"
        FROM "User" u
        ${excludeIds.length > 0 ? Prisma.sql`WHERE u.id NOT IN (${Prisma.join(excludeIds)})` : Prisma.empty}
        ORDER BY "followerCount" DESC, "postCount" DESC
        LIMIT ${limit}
      `;

      // Map users with isFollowing state (all in same transaction)
      return rawUsers.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        profileImage: u.profileImage,
        subscriptionTier: u.subscriptionTier,
        _count: {
          followers: Number(u.followerCount),
          posts: Number(u.postCount),
        },
        isFollowing: followingIds.includes(u.id),
      }));
    });

    const response = NextResponse.json(usersWithFollowState, { status: 200 });
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
