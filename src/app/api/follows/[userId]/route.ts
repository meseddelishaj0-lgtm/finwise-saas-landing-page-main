import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/follows/:userId - Get follow counts (PUBLIC)
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return NextResponse.json({ followersCount, followingCount });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/follows/:userId - Follow a user
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { followerId } = await req.json();
    const followingId = parseInt(params.userId);

    if (!followerId) {
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    const follow = await prisma.follow.create({
      data: { followerId, followingId },
    });

    return NextResponse.json(follow, { status: 201 });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }
}

// DELETE /api/follows/:userId - Unfollow a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { followerId } = await req.json();
    const followingId = parseInt(params.userId);

    if (!followerId) {
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    return NextResponse.json({ message: "Unfollowed" }, { status: 200 });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
  }
}
