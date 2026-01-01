import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(params.postId) },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
        forum: { select: { id: true, title: true, slug: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching post:", err);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = parseInt(params.postId);
    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    
    if (post.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { title, content },
      include: {
        user: { select: { id: true, name: true, email: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true } },
      }
    });

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (err) {
    console.error("❌ Error updating post:", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const postId = parseInt(params.postId);
    let userId: number | null = null;

    // Try session auth first (web)
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
      if (user) {
        userId = user.id;
      }
    }

    // Fallback to x-user-id header (mobile app)
    if (!userId) {
      const headerUserId = req.headers.get('x-user-id');
      if (headerUserId) {
        userId = parseInt(headerUserId, 10);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete related records first (comments, likes, etc.)
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId } }),
      prisma.like.deleteMany({ where: { postId } }),
      prisma.sentiment.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);

    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
