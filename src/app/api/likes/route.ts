import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushNotificationToUser, NotificationMessages } from "@/lib/pushNotifications";

// POST /api/likes - Toggle like
export async function POST(req: NextRequest) {
  try {
    const { postId, commentId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
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

    const existingLike = await prisma.like.findFirst({
      where: {
        userId: user.id,
        ...(postId ? { postId } : { commentId })
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      const likesCount = await prisma.like.count({
        where: postId ? { postId } : { commentId }
      });

      return NextResponse.json({ liked: false, likesCount }, { status: 200 });
    } else {
      await prisma.like.create({
        data: {
          userId: user.id,
          ...(postId ? { postId } : { commentId })
        }
      });

      const likesCount = await prisma.like.count({
        where: postId ? { postId } : { commentId }
      });

      // Send notification to the post/comment author
      try {
        const likerName = user.username || user.name || 'Someone';

        if (postId) {
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true, title: true },
          });

          // Don't notify if user likes their own post
          if (post && post.userId !== userId) {
            await prisma.notification.create({
              data: {
                type: 'like',
                userId: post.userId,
                fromUserId: userId,
                postId: postId,
                message: `${likerName} liked your post`,
              },
            });

            const { title, body } = NotificationMessages.like(likerName);
            await sendPushNotificationToUser(
              post.userId,
              title,
              body,
              { type: 'like', postId },
              { channelId: 'social' }
            );
          }
        } else if (commentId) {
          const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true, postId: true },
          });

          // Don't notify if user likes their own comment
          if (comment && comment.userId !== userId) {
            await prisma.notification.create({
              data: {
                type: 'like',
                userId: comment.userId,
                fromUserId: userId,
                postId: comment.postId,
                message: `${likerName} liked your comment`,
              },
            });

            const { title, body } = NotificationMessages.like(likerName);
            await sendPushNotificationToUser(
              comment.userId,
              title,
              body,
              { type: 'like', postId: comment.postId, commentId },
              { channelId: 'social' }
            );
          }
        }
      } catch (notifError) {
        console.error('Error creating like notification:', notifError);
        // Don't fail the like if notification fails
      }

      return NextResponse.json({ liked: true, likesCount }, { status: 201 });
    }
  } catch (err) {
    console.error("❌ Error toggling like:", err);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}

// GET /api/likes?postId=123 - Get likes (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postIdParam = searchParams.get("postId");
    const commentIdParam = searchParams.get("commentId");

    if (!postIdParam && !commentIdParam) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
        { status: 400 }
      );
    }

    const postId = postIdParam ? parseInt(postIdParam, 10) : undefined;
    const commentId = commentIdParam ? parseInt(commentIdParam, 10) : undefined;

    const likes = await prisma.like.findMany({
      where: postId ? { postId } : { commentId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(likes, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching likes:", err);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}
