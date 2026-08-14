import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "post";

// GET /api/newsroom            → published articles (public)
// GET /api/newsroom?manage=1   → all articles incl. drafts (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("manage") === "1") {
      const admin = await getAdminEmail();
      if (!admin) return NextResponse.json({ admin: false, articles: [] }, { status: 403 });
      const articles = await prisma.newsArticle.findMany({
        orderBy: { publishedAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ admin: true, articles });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
    const articles = await prisma.newsArticle.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        imageUrl: true,
        symbol: true,
        publishedAt: true,
      },
    });
    return NextResponse.json({ articles });
  } catch (e) {
    console.error("newsroom GET error", e);
    return NextResponse.json({ error: "Failed to load articles" }, { status: 500 });
  }
}

// POST /api/newsroom → create article (admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminEmail();
    if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "").trim();
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const base = slugify(title);
    let slug = base;
    while (await prisma.newsArticle.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${Date.now().toString(36)}`;
    }

    const article = await prisma.newsArticle.create({
      data: {
        slug,
        title,
        content,
        summary: String(body?.summary ?? "").trim() || null,
        imageUrl: String(body?.imageUrl ?? "").trim() || null,
        symbol: String(body?.symbol ?? "").trim().toUpperCase() || null,
        published: body?.published !== false,
        authorEmail: admin,
      },
    });
    return NextResponse.json({ article });
  } catch (e) {
    console.error("newsroom POST error", e);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
