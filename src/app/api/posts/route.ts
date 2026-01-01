// api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/posts - Get all posts (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forumSlug = searchParams.get("forum");
    const userId = searchParams.get("userId");
    const currentUserId = searchParams.get("currentUserId");

    const where: any = {};
    
    if (forumSlug) {
      where.forum = { slug: forumSlug };
    }
    
    if (userId) {
      where.userId = parseInt(userId, 10);
    }

    // Filter out posts from blocked users
    if (currentUserId) {
      const blockedUsers = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: parseInt(currentUserId, 10) },
            { blockedId: parseInt(currentUserId, 10) },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });
      
      const blockedIds = blockedUsers.flatMap(b => [b.blockerId, b.blockedId]);
      const uniqueBlockedIds = [...new Set(blockedIds)].filter(id => id !== parseInt(currentUserId, 10));
      
      if (uniqueBlockedIds.length > 0) {
        where.userId = { notIn: uniqueBlockedIds };
      }
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true, karma: true, isVerified: true, subscriptionTier: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true, sentiments: true } },
        tickerMentions: { select: { ticker: true } },
        sentiments: currentUserId ? {
          where: { userId: parseInt(currentUserId, 10) },
          select: { type: true },
        } : false,
      },
      orderBy: { createdAt: "desc" },
    });

    // Add sentiment counts to each post
    const postsWithSentiment = await Promise.all(posts.map(async (post) => {
      const sentimentCounts = await prisma.sentiment.groupBy({
        by: ['type'],
        where: { postId: post.id },
        _count: { type: true },
      });

      const bullish = sentimentCounts.find(s => s.type === 'bullish')?._count.type || 0;
      const bearish = sentimentCounts.find(s => s.type === 'bearish')?._count.type || 0;

      return {
        ...post,
        tickers: post.tickerMentions.map(tm => tm.ticker),
        sentiment: {
          bullish,
          bearish,
          total: bullish + bearish,
          userVote: post.sentiments?.[0]?.type || null,
        },
      };
    }));

    return NextResponse.json(postsWithSentiment, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    const { title, content, forumId, userId, ticker, mediaUrl } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!title || !content || !forumId) {
      return NextResponse.json(
        { error: "Title, content, and forumId are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forum = await prisma.forum.findUnique({
      where: { id: forumId }
    });

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Extract tickers ($AAPL, $TSLA) from content
    const tickerRegex = /\$([A-Za-z]{1,5})\b/g;
    const tickerMatches: string[] = (content.match(tickerRegex) || []) as string[];
    const tickers: string[] = Array.from(new Set(tickerMatches.map((m) => m.substring(1).toUpperCase())));

    // Extract mentions (@username) from content
    const mentionRegex = /@([A-Za-z0-9_]{1,30})\b/g;
    const mentionMatches: string[] = (content.match(mentionRegex) || []) as string[];
    const mentions: string[] = Array.from(new Set(mentionMatches.map((m) => m.substring(1).toLowerCase())));

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        forumId,
        userId: user.id,
        mediaUrl: mediaUrl || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, profileImage: true, subscriptionTier: true } },
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      }
    });

    // Save ticker mentions
    if (tickers.length > 0) {
      await prisma.tickerMention.createMany({
        data: tickers.map((t: string) => ({
          ticker: t,
          postId: newPost.id,
        })),
      });
    }

    // Save user mentions and create notifications
    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          username: { in: mentions },
        },
        select: { id: true, username: true },
      });

      if (mentionedUsers.length > 0) {
        // Create mention records
        await prisma.mention.createMany({
          data: mentionedUsers.map(u => ({
            mentionedUserId: u.id,
            postId: newPost.id,
          })),
        });

        // Create notifications for mentioned users
        await prisma.notification.createMany({
          data: mentionedUsers
            .filter(u => u.id !== userId) // Don't notify yourself
            .map(u => ({
              userId: u.id,
              type: 'mention',
              postId: newPost.id,
              fromUserId: userId,
              message: `@${user.username || user.name || 'Someone'} mentioned you in a post`,
            })),
        });
      }
    }

    // Award karma for posting
    await prisma.user.update({
      where: { id: userId },
      data: { karma: { increment: 2 } },
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating post:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
