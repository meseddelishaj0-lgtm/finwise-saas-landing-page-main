import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE /api/reactions/:id - Delete reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const reactionId = parseInt(params.id, 10);

    const reaction = await prisma.reaction.findUnique({
      where: { id: reactionId }
    });

    if (!reaction) {
      return NextResponse.json({ error: "Reaction not found" }, { status: 404 });
    }

    if (reaction.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own reactions" },
        { status: 403 }
      );
    }

    await prisma.reaction.delete({
      where: { id: reactionId }
    });

    return NextResponse.json({ success: true, message: "Reaction deleted" }, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting reaction:", err);
    return NextResponse.json({ error: "Failed to delete reaction" }, { status: 500 });
  }
}
