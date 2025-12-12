import { NextRequest, NextResponse } from "next/server";
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
      where: { postId: parseInt(postId, 10) },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
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

// POST /api/comments - Create comment
export async function POST(req: NextRequest) {
  try {
    const { postId, content, userId } = await req.json();

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

    const newComment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
        _count: { select: { likes: true } },
      }
    });

    // Send notification to post author
    try {
      // Don't notify if user comments on their own post
      if (post.userId !== userId) {
        const commenterName = user.username || user.name || 'Someone';

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
