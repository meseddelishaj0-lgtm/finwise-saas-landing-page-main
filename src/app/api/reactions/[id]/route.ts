import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveMobileUserId } from "@/lib/mobileAuth";

// DELETE /api/reactions/:id - Delete reaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: claimedUserId } = await req.json();

    // Verify the caller owns the id before the ownership check below, so a
    // spoofed userId can't delete another user's reaction.
    const auth = resolveMobileUserId(req, claimedUserId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId;

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
