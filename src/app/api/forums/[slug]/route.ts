import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const forum = await prisma.forum.findUnique({
      where: { slug: params.slug },
    });

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    const posts = await prisma.post.findMany({
      where: { forumId: forum.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { title, content, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing title or content" },
        { status: 400 }
      );
    }

    const forum = await prisma.forum.findUnique({
      where: { slug: params.slug },
    });

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        userId: user.id,
        forumId: forum.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        forum: {
          select: { id: true, title: true, slug: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating post:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
