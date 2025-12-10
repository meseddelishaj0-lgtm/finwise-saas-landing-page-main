import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/likes - Toggle like
export async function POST(req: NextRequest) {
  try {
    const { postId, commentId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId: user.id,
        ...(postId ? { postId } : { commentId })
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      const likesCount = await prisma.like.count({
        where: postId ? { postId } : { commentId }
      });

      return NextResponse.json({ liked: false, likesCount }, { status: 200 });
    } else {
      await prisma.like.create({
        data: {
          userId: user.id,
          ...(postId ? { postId } : { commentId })
        }
      });

      const likesCount = await prisma.like.count({
        where: postId ? { postId } : { commentId }
      });

      return NextResponse.json({ liked: true, likesCount }, { status: 201 });
    }
  } catch (err) {
    console.error("❌ Error toggling like:", err);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}

// GET /api/likes?postId=123 - Get likes (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postIdParam = searchParams.get("postId");
    const commentIdParam = searchParams.get("commentId");

    if (!postIdParam && !commentIdParam) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
        { status: 400 }
      );
    }

    const postId = postIdParam ? parseInt(postIdParam, 10) : undefined;
    const commentId = commentIdParam ? parseInt(commentIdParam, 10) : undefined;

    const likes = await prisma.like.findMany({
      where: postId ? { postId } : { commentId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(likes, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching likes:", err);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}
