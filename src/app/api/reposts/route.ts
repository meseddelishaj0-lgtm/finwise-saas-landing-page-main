// api/reposts/route.ts
// Toggle a repost on a post (retweet-style signal boost). Mirrors /api/likes:
// POST { postId, userId } → creates or removes the Repost row and returns
// { reposted, repostsCount }. Reposting notifies the post author (social).
import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from "@/lib/mobileAuth";
import prisma from "@/lib/prisma";
import { sendPushNotificationToUser, NotificationMessages } from "@/lib/pushNotifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { postId, userId } = await req.json();
    const auth = resolveMobileUserId(req, userId);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      select: { id: true, userId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await prisma.repost.findUnique({
      where: { userId_postId: { userId: auth.userId, postId: post.id } },
    });

    let reposted: boolean;
    if (existing) {
      await prisma.repost.delete({ where: { id: existing.id } });
      reposted = false;
    } else {
      try {
        await prisma.repost.create({ data: { userId: auth.userId, postId: post.id } });
      } catch (e: any) {
        if (e.code !== "P2002") throw e; // double-tap race: already reposted
      }
      reposted = true;

      // Notify the post author (not on un-repost, not on self-repost)
      if (post.userId !== auth.userId) {
        try {
          const reposter = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: { username: true, name: true },
          });
          const reposterName = reposter?.username || reposter?.name || "Someone";

          await prisma.notification.create({
            data: {
              type: "repost",
              userId: post.userId,
              fromUserId: auth.userId,
              postId: post.id,
              message: `${reposterName} reposted your post`,
            },
          });

          const { title, body } = NotificationMessages.repost(reposterName);
          await sendPushNotificationToUser(post.userId, title, body, {
            type: "repost",
            postId: post.id,
          });
        } catch (notifError) {
          console.error("Error creating repost notification:", notifError);
        }
      }
    }

    const repostsCount = await prisma.repost.count({ where: { postId: post.id } });
    return NextResponse.json({ reposted, repostsCount });
  } catch (err) {
    console.error("❌ Error toggling repost:", err);
    return NextResponse.json({ error: "Failed to repost" }, { status: 500 });
  }
}
