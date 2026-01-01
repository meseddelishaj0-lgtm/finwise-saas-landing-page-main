import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export const dynamic = 'force-dynamic';

// Create fresh connection to avoid stale reads from Neon replicas
function createFreshPrisma() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// POST /api/follows - Follow a user (toggle behavior)
export async function POST(req: NextRequest) {
  const prisma = createFreshPrisma();

  try {
    const { followerId, followingId } = await req.json();

    if (!followerId) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    if (!followingId) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    if (followerId === followingId) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    // Check if follow exists using fresh connection
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: followerId,
        followingId: followingId
      }
    });

    console.log('📍 Follow check:', { followerId, followingId, existingFollow: !!existingFollow });

    // Toggle behavior: if already following, unfollow
    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      });
      console.log('📍 Unfollowed:', { followerId, followingId });
      await prisma.$disconnect();
      return NextResponse.json({
        success: true,
        action: 'unfollowed',
        isFollowing: false,
        message: "Unfollowed successfully"
      }, { status: 200 });
    }

    // Otherwise, create new follow
    const follow = await prisma.follow.create({
      data: {
        followerId: followerId,
        followingId: followingId
      },
      include: {
        following: { select: { id: true, name: true, email: true } }
      }
    });

    console.log('📍 Followed:', { followerId, followingId });
    await prisma.$disconnect();
    return NextResponse.json({
      ...follow,
      success: true,
      action: 'followed',
      isFollowing: true
    }, { status: 201 });
  } catch (err) {
    console.error("❌ Error following user:", err);
    await prisma.$disconnect();
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

// DELETE /api/follows - Unfollow a user
export async function DELETE(req: NextRequest) {
  const prisma = createFreshPrisma();

  try {
    const { followerId, followingId } = await req.json();

    if (!followerId) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    if (!followingId) {
      await prisma.$disconnect();
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: followerId,
        followingId: followingId
      }
    });

    console.log('📍 Unfollowed (DELETE):', { followerId, followingId });
    await prisma.$disconnect();
    return NextResponse.json({ message: "Unfollowed successfully", isFollowing: false }, { status: 200 });
  } catch (err) {
    console.error("❌ Error unfollowing user:", err);
    await prisma.$disconnect();
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
