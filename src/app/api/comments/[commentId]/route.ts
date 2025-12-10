import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 🟡 UPDATE COMMENT
export async function PUT(
  req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    const commentId = Number(params.commentId);

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("❌ Error updating comment:", err);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

// 🔴 DELETE COMMENT (hard delete since no soft delete in schema)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commentId = Number(params.commentId);

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: "Comment deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
