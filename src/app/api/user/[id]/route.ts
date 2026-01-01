import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        profileComplete: true,
        createdAt: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        karma: true,
        isVerified: true,
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
    }, { status: 200, headers: NO_CACHE_HEADERS });
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

      // Check if username is taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          NOT: { id: userId },
        },
      });

      if (existingUser) {
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

    return NextResponse.json(updatedUser, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
