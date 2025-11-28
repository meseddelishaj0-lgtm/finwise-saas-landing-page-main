import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/posts/:id - Get single post (PUBLIC)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id, 10);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching post:", err);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

// DELETE /api/posts/:id - Delete post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const postId = parseInt(params.id, 10);

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    return NextResponse.json({ success: true, message: "Post deleted" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
