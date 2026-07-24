import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from '@/lib/mobileAuth';
import prisma from "@/lib/prisma";
import { sendPushNotificationToUser, NotificationMessages } from "@/lib/pushNotifications";

// GET /api/comments?postId=123 - Get comments (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { postId: parseInt(postId, 10), isDeleted: false },
      include: {
        user: { select: { id: true, name: true, username: true, profileImage: true, subscriptionTier: true, isVerified: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// POST /api/comments - Create comment (or a reply when parentId is given)
export async function POST(req: NextRequest) {
  try {
    const { postId, content, userId, parentId } = await req.json();
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) return NextResponse.json({ error: _auth.error }, { status: _auth.status });

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!postId || !content) {
      return NextResponse.json(
        { error: "postId and content are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, title: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Replying to a comment: parent must exist and belong to the same post.
    let parentComment: { id: number; userId: number } | null = null;
    if (parentId != null) {
      parentComment = await prisma.comment.findFirst({
        where: { id: Number(parentId), postId: Number(postId) },
        select: { id: true, userId: true },
      });
      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found on this post" },
          { status: 400 }
        );
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: user.id,
        parentId: parentComment?.id ?? null,
      },
      include: {
        user: { select: { id: true, name: true, username: true, profileImage: true, subscriptionTier: true, isVerified: true } },
        _count: { select: { likes: true } },
      }
    });

    // Send notification to post author
    try {
      const commenterName = user.username || user.name || 'Someone';

      if (parentComment) {
        // Reply → notify the parent comment's author (not themselves)
        if (parentComment.userId !== userId) {
          await prisma.notification.create({
            data: {
              type: 'reply',
              userId: parentComment.userId,
              fromUserId: userId,
              postId: postId,
              message: `${commenterName} replied to your comment`,
            },
          });

          const { title, body } = NotificationMessages.reply(commenterName);
          await sendPushNotificationToUser(
            parentComment.userId,
            title,
            body,
            { type: 'reply', postId },
            { channelId: 'social' }
          );
        }
      } else if (post.userId !== userId) {
        // Top-level comment → notify the post author (existing behavior)
        await prisma.notification.create({
          data: {
            type: 'comment',
            userId: post.userId,
            fromUserId: userId,
            postId: postId,
            message: `${commenterName} commented on your post`,
          },
        });

        const { title, body } = NotificationMessages.comment(commenterName);
        await sendPushNotificationToUser(
          post.userId,
          title,
          body,
          { type: 'comment', postId },
          { channelId: 'social' }
        );
      }
    } catch (notifError) {
      console.error('Error creating comment notification:', notifError);
      // Don't fail the comment if notification fails
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating comment:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
