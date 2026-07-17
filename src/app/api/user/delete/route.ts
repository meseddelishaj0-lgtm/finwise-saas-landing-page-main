// src/app/api/user/delete/route.ts
// Permanently delete a user account and all their data (GDPR). The app used to
// call a non-existent endpoint on a stale host and clear local data regardless
// of the response, so accounts were never actually deleted server-side.
//
// Several User relations lack onDelete: Cascade, so we delete child rows in a
// FK-safe order inside a transaction. If anything fails the whole thing rolls
// back and returns an error — the client only wipes local data on a 2xx.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenUserId } from "@/lib/mobileAuth";

async function deleteUser(userId: number) {
  await prisma.$transaction([
    // Rows the user created that reference posts/comments/other users
    prisma.commentLike.deleteMany({ where: { userId } }),
    prisma.like.deleteMany({ where: { userId } }),
    prisma.reaction.deleteMany({ where: { userId } }),
    prisma.sentiment.deleteMany({ where: { userId } }),
    prisma.postView.deleteMany({ where: { userId } }),
    prisma.mention.deleteMany({ where: { mentionedUserId: userId } }),
    prisma.notification.deleteMany({ where: { OR: [{ userId }, { fromUserId: userId }] } }),
    // Reports made by the user, about the user, or on the user's posts/comments
    prisma.report.deleteMany({
      where: { OR: [{ reporterId: userId }, { reportedUserId: userId }, { post: { userId } }, { comment: { userId } }] },
    }),
    prisma.mute.deleteMany({ where: { OR: [{ oderId: userId }, { mutedId: userId }] } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
    prisma.message.deleteMany({ where: { senderId: userId } }),
    prisma.conversation.deleteMany({ where: { OR: [{ participant1: userId }, { participant2: userId }] } }),
    prisma.priceAlert.deleteMany({ where: { userId } }),
    prisma.watchlistItem.deleteMany({ where: { userId } }),
    prisma.deviceToken.deleteMany({ where: { userId } }),
    prisma.referral.deleteMany({ where: { OR: [{ referrerId: userId }, { referredUserId: userId }] } }),
    prisma.bugReport.deleteMany({ where: { userId } }),
    prisma.screenerPreset.deleteMany({ where: { userId } }),
    // Portfolios (holdings cascade on portfolioId)
    prisma.portfolio.deleteMany({ where: { userId } }),
    // Comment/post children cascade on commentId/postId
    prisma.comment.deleteMany({ where: { userId } }),
    prisma.post.deleteMany({ where: { userId } }),
    // Finally the account
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

async function handle(req: NextRequest) {
  try {
    // Account deletion is irreversible, so it REQUIRES a verified token — we
    // never trust the spoofable client-supplied userId, and there is no strict-
    // mode fallback here. A caller can only delete their own account.
    const tokenUserId = getTokenUserId(req);
    if (tokenUserId == null) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const claimed = body?.userId ?? new URL(req.url).searchParams.get("userId");
    if (claimed != null && String(claimed) !== "" && Number(claimed) !== tokenUserId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    const userId = tokenUserId;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      // Already gone — treat as success so the client can finish cleanup
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
