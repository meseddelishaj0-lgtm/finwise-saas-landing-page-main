import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/comments?postId=123 - Get comments (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { postId: parseInt(postId, 10) },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// POST /api/comments - Create comment
export async function POST(req: NextRequest) {
  try {
    const { postId, content, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!postId || !content) {
      return NextResponse.json(
        { error: "postId and content are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
        _count: { select: { likes: true } },
      }
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating comment:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
