import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/posts - Get all posts (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forumSlug = searchParams.get("forum");

    const where = forumSlug ? { forum: { slug: forumSlug } } : {};

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    const { title, content, forumId, userId, ticker, image } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!title || !content || !forumId) {
      return NextResponse.json(
        { error: "Title, content, and forumId are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forum = await prisma.forum.findUnique({
      where: { id: forumId }
    });

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        forumId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      }
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating post:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
