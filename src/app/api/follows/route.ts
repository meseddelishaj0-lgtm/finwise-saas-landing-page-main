import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/follows - Follow a user
export async function POST(req: NextRequest) {
  try {
    const { followerId, followingId } = await req.json();

    if (!followerId) {
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    if (!followingId) {
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: followerId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return NextResponse.json({ error: "User to follow not found" }, { status: 404 });
    }

    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: followerId,
        followingId: followingId
      }
    });

    // Toggle behavior: if already following, unfollow
    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      });
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

    return NextResponse.json({
      ...follow,
      success: true,
      action: 'followed',
      isFollowing: true
    }, { status: 201 });
  } catch (err) {
    console.error("❌ Error following user:", err);
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

// DELETE /api/follows - Unfollow a user
export async function DELETE(req: NextRequest) {
  try {
    const { followerId, followingId } = await req.json();

    if (!followerId) {
      return NextResponse.json({ error: "followerId is required" }, { status: 401 });
    }

    if (!followingId) {
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: followerId,
        followingId: followingId
      }
    });

    return NextResponse.json({ message: "Unfollowed successfully" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error unfollowing user:", err);
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
