import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncDiamondVerification } from '@/lib/verification';
import { getVerifiedSubscription } from '@/lib/verifySubscription';
import { resolveMobileUserId } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

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
  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check if current user is following this user
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get("currentUserId");
    const parsedCurrentUserId = currentUserId ? parseInt(currentUserId, 10) : null;

    // Use a SINGLE transaction for ALL queries to ensure data consistency
    // This prevents stale reads from different connections
    const result = await prisma.$transaction(async (tx) => {
      // Force primary connection
      await tx.$executeRaw`SELECT 1`;

      // Get user data
      const users = await tx.$queryRaw<any[]>`
        SELECT
          id, name, username, bio, location, website,
          "profileImage", "bannerImage", "profileComplete", "createdAt",
          "subscriptionTier", "subscriptionStatus", karma, "isVerified"
        FROM "User"
        WHERE id = ${userId}
        LIMIT 1
      `;

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get all counts in a single query for efficiency
      const counts = await tx.$queryRaw<[{
        postCount: bigint;
        followerCount: bigint;
        followingCount: bigint;
        likeCount: bigint;
      }]>`
        SELECT
          (SELECT COUNT(*) FROM "Post" WHERE "userId" = ${userId}) as "postCount",
          (SELECT COUNT(*) FROM "Follow" WHERE "followingId" = ${userId}) as "followerCount",
          (SELECT COUNT(*) FROM "Follow" WHERE "followerId" = ${userId}) as "followingCount",
          (SELECT COUNT(*) FROM "Like" WHERE "userId" = ${userId}) as "likeCount"
      `;

      // Check if current user is following this user (inside same transaction)
      let isFollowing = false;
      if (parsedCurrentUserId) {
        const followCheck = await tx.$queryRaw<any[]>`
          SELECT 1 FROM "Follow"
          WHERE "followerId" = ${parsedCurrentUserId}
          AND "followingId" = ${userId}
          LIMIT 1
        `;
        isFollowing = followCheck.length > 0;
      }

      return {
        id: user.id,
        name: user.name,
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
          posts: Number(counts[0].postCount),
          followers: Number(counts[0].followerCount),
          following: Number(counts[0].followingCount),
          likes: Number(counts[0].likeCount),
        },
        isFollowing,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('📍 GET /api/user/[id] - All data in single txn:', { id: result.id, name: result.name, followers: result._count.followers, isFollowing: result.isFollowing });

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
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

// PUT /api/user/:id - Update user profile
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Only the account owner may edit this profile (token must match the id).
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) {
      return NextResponse.json({ error: _auth.error }, { status: _auth.status });
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

    // Handle subscription tier update (synced from the app's RevenueCat
    // state on launch). Tier-gated endpoints (e.g. /api/stock-picks) require
    // an ACTIVE status AND an unexpired subscriptionExpiry, so set a rolling
    // 35-day expiry here — the app re-syncs on every launch while the
    // subscription is live, so the window keeps sliding; if the user cancels,
    // the sync stops and access lapses within the window.
    if (subscriptionTier !== undefined) {
      if (process.env.REVENUECAT_API_KEY) {
        // SECURE: verify with RevenueCat, ignore the client's claim. Unverified
        // → leave the stored tier untouched (never downgrade here, never elevate
        // on an unverified claim). This closes the free-tier bypass.
        const verified = await getVerifiedSubscription(userId);
        if (verified) {
          updateData.subscriptionTier = verified.subscriptionTier;
          updateData.subscriptionStatus = verified.subscriptionStatus;
          updateData.subscriptionProductId = verified.subscriptionProductId;
          updateData.subscriptionExpiry = verified.subscriptionExpiry;
        }
      } else {
        // LEGACY (RevenueCat verification not configured): prior client-trusted
        // behavior so tier sync keeps working. Spoofable — set REVENUECAT_API_KEY
        // to switch to the secure path with no code change.
        const validTiers = ['free', 'gold', 'platinum', 'diamond'];
        const tier = subscriptionTier.toLowerCase();
        if (validTiers.includes(tier)) {
          updateData.subscriptionTier = tier;
          if (tier !== 'free') {
            updateData.subscriptionStatus = 'active';
            updateData.subscriptionExpiry = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
          } else {
            updateData.subscriptionStatus = null;
            updateData.subscriptionExpiry = null;
          }
        }
      }
    }

    // Mark profile as complete if username and name are set
    if (username && name) {
      updateData.profileComplete = true;
    }

    console.log('📝 Updating user profile via /api/user/[id]:', { userId, updateData });

    // Use transaction for update + read-back to ensure consistency
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Force primary connection
      await tx.$executeRaw`SELECT 1`;

      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
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

      return user;
    });

    if (updateData.subscriptionTier !== undefined) {
      await syncDiamondVerification(userId, updateData.subscriptionTier);
    }

    console.log('✅ User profile updated:', { id: updatedUser.id, name: updatedUser.name, tier: updatedUser.subscriptionTier });

    return NextResponse.json(updatedUser, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
