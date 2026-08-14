import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// PATCH /api/newsroom/:id → update fields / publish toggle (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminEmail();
    if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.content === "string" && body.content.trim()) data.content = body.content.trim();
    if ("summary" in body) data.summary = String(body.summary ?? "").trim() || null;
    if ("imageUrl" in body) data.imageUrl = String(body.imageUrl ?? "").trim() || null;
    if ("symbol" in body) data.symbol = String(body.symbol ?? "").trim().toUpperCase() || null;
    if (typeof body.published === "boolean") {
      data.published = body.published;
      if (body.published) data.publishedAt = new Date();
    }

    const article = await prisma.newsArticle.update({ where: { id }, data });
    return NextResponse.json({ article });
  } catch (e) {
    console.error("newsroom PATCH error", e);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

// DELETE /api/newsroom/:id → permanently delete (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminEmail();
    if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    await prisma.newsArticle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("newsroom DELETE error", e);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
