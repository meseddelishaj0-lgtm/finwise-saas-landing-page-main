import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/posts/search?q=...&ticker=... - Search posts (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const ticker = searchParams.get("ticker");

    if (!query && !ticker) {
      return NextResponse.json(
        { error: "Search query or ticker required" },
        { status: 400 }
      );
    }

    const where: any = {};

    if (query && ticker) {
      where.AND = [
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } }
          ]
        },
        { ticker: { equals: ticker, mode: "insensitive" } }
      ];
    } else if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } }
      ];
    } else if (ticker) {
      where.ticker = { equals: ticker, mode: "insensitive" };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (err) {
    console.error("❌ Error searching posts:", err);
    return NextResponse.json({ error: "Failed to search posts" }, { status: 500 });
  }
}
