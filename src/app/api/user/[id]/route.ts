import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export const dynamic = 'force-dynamic';

// Create a fresh connection for reads to avoid stale data
function createFreshPrisma() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// GET /api/user/:id - Get user profile
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Create fresh connection to avoid stale reads after updates
  const prisma = createFreshPrisma();

  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Use transaction to force reading from primary database (bypasses Neon replica lag)
    const users = await prisma.$transaction(async (tx) => {
      // Force a write operation first to ensure we're on the primary
      await tx.$executeRaw`SELECT 1`;

      return await tx.$queryRaw<any[]>`
        SELECT
          id, name, email, username, bio, location, website,
          "profileImage", "bannerImage", "profileComplete", "createdAt",
          "subscriptionTier", "subscriptionStatus", karma, "isVerified"
        FROM "User"
        WHERE id = ${userId}
        LIMIT 1
      `;
    });

    if (!users || users.length === 0) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Get counts using raw SQL for consistency
    const postCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Post" WHERE "userId" = ${userId}
    `;
    const followerCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Follow" WHERE "followingId" = ${userId}
    `;
    const followingCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Follow" WHERE "followerId" = ${userId}
    `;
    const likeCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Like" WHERE "userId" = ${userId}
    `;

    // Check if current user is following this user
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get("currentUserId");

    let isFollowing = false;
    if (currentUserId) {
      const followCheck = await prisma.$queryRaw<any[]>`
        SELECT 1 FROM "Follow"
        WHERE "followerId" = ${parseInt(currentUserId, 10)}
        AND "followingId" = ${userId}
        LIMIT 1
      `;
      isFollowing = followCheck.length > 0;
    }

    const result = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      location: user.location,
      website: user.website,
      profileImage: user.profileImage,
      bannerImage: user.bannerImage,
      profileComplete: user.profileComplete,
      createdAt: user.createdAt,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      karma: user.karma,
      isVerified: user.isVerified,
      _count: {
        posts: Number(postCount[0].count),
        followers: Number(followerCount[0].count),
        following: Number(followingCount[0].count),
        likes: Number(likeCount[0].count),
      },
      isFollowing,
    };

    console.log('📍 GET /api/user/[id] - Raw SQL fresh data:', { id: result.id, name: result.name, username: result.username });

    await prisma.$disconnect();
    return NextResponse.json(result, {
      status: 200,
      headers: {
        ...NO_CACHE_HEADERS,
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
      }
    });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    await prisma.$disconnect();
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

// PUT /api/user/:id - Update user profile
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Use fresh connection for both write and read-back
  const prisma = createFreshPrisma();

  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await req.json();
    const { username, name, bio, location, website, profileImage, bannerImage, subscriptionTier } = body;

    // Build update data - only include fields that were provided
    const updateData: Record<string, any> = {};

    // Handle username update with validation
    if (username !== undefined) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        await prisma.$disconnect();
        return NextResponse.json(
          { error: 'Username must be 3-20 characters, letters, numbers, and underscores only' },
          { status: 400 }
        );
      }

      // Check if username is taken by another user (use fresh connection)
      const existingUsers = await prisma.$queryRaw<any[]>`
        SELECT id FROM "User" WHERE LOWER(username) = LOWER(${username}) AND id != ${userId} LIMIT 1
      `;

      if (existingUsers.length > 0) {
        await prisma.$disconnect();
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }

      updateData.username = username.toLowerCase();
    }

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage;

    // Handle subscription tier update
    if (subscriptionTier !== undefined) {
      const validTiers = ['free', 'gold', 'platinum', 'diamond'];
      const tier = subscriptionTier.toLowerCase();
      if (validTiers.includes(tier)) {
        updateData.subscriptionTier = tier;
        updateData.subscriptionStatus = tier !== 'free' ? 'active' : null;
      }
    }

    // Mark profile as complete if username and name are set
    if (username && name) {
      updateData.profileComplete = true;
    }

    console.log('📝 Updating user profile via /api/user/[id]:', { userId, updateData });

    // Use fresh connection for the update
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        profileComplete: true,
        createdAt: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        karma: true,
        isVerified: true,
      },
    });

    console.log('✅ User profile updated:', { id: updatedUser.id, name: updatedUser.name, tier: updatedUser.subscriptionTier });

    await prisma.$disconnect();
    return NextResponse.json(updatedUser, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    await prisma.$disconnect();
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
