import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE /api/comments/:id - Delete comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const commentId = parseInt(params.id);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true, message: "Comment deleted" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
