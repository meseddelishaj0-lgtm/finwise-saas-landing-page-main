// api/mobile/home-feed/route.ts
// Combined endpoint for mobile app home screen - reduces multiple API calls to one
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
// Note: Can't use Edge Runtime because Prisma requires Node.js APIs

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const userIdNum = userId ? parseInt(userId, 10) : null;

    // Run all queries in parallel for maximum speed
    const [
      recentPosts,
      notifications,
      unreadMessagesCount,
      userLikes,
      userSentiments,
    ] = await Promise.all([
      // Get recent posts (limit 20 for mobile)
      prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true,
              isVerified: true,
              subscriptionTier: true
            }
          },
          forum: { select: { id: true, title: true, slug: true } },
          _count: { select: { comments: true, likes: true } },
          tickerMentions: { select: { ticker: true } },
        },
      }),

      // Get unread notifications count
      userIdNum ? prisma.notification.count({
        where: {
          userId: userIdNum,
          isRead: false
        },
      }) : 0,

      // Get unread messages count
      userIdNum ? prisma.message.count({
        where: {
          conversation: {
            OR: [
              { participant1: userIdNum },
              { participant2: userIdNum },
            ],
          },
          senderId: { not: userIdNum },
          isRead: false,
        },
      }) : 0,

      // Get user's likes on posts (to show isLiked state)
      userIdNum ? prisma.like.findMany({
        where: {
          userId: userIdNum,
          postId: { not: null },
        },
        select: { postId: true },
      }) : [],

      // Get user's sentiment votes
      userIdNum ? prisma.sentiment.findMany({
        where: { userId: userIdNum },
        select: { postId: true, type: true },
      }) : [],
    ]);

    // Create lookup sets for quick access
    const likedPostIds = new Set(userLikes.map(l => l.postId));
    const userSentimentMap = new Map(userSentiments.map(s => [s.postId, s.type]));

    // Get sentiment counts for all posts
    const postIds = recentPosts.map(p => p.id);
    const sentimentCounts = await prisma.sentiment.groupBy({
      by: ['postId', 'type'],
      where: { postId: { in: postIds } },
      _count: { type: true },
    });

    // Create sentiment map
    const sentimentMap = new Map<number, { bullish: number; bearish: number }>();
    sentimentCounts.forEach(s => {
      const current = sentimentMap.get(s.postId) || { bullish: 0, bearish: 0 };
      if (s.type === 'bullish') current.bullish = s._count.type;
      if (s.type === 'bearish') current.bearish = s._count.type;
      sentimentMap.set(s.postId, current);
    });

    // Enhance posts with isLiked, tickers, and sentiment data
    const enhancedPosts = recentPosts.map(post => {
      const sentiment = sentimentMap.get(post.id) || { bullish: 0, bearish: 0 };
      return {
        ...post,
        isLiked: likedPostIds.has(post.id),
        tickers: post.tickerMentions.map(tm => tm.ticker),
        sentiment: {
          bullish: sentiment.bullish,
          bearish: sentiment.bearish,
          total: sentiment.bullish + sentiment.bearish,
          userVote: userSentimentMap.get(post.id) || null,
        },
      };
    });

    // Return fresh data - no caching for community feed to ensure new posts show immediately
    const response = NextResponse.json({
      posts: enhancedPosts,
      notificationsCount: notifications,
      unreadMessagesCount,
      cachedAt: new Date().toISOString(),
    });

    // Disable caching to ensure fresh posts on every request
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    );

    return response;
  } catch (error) {
    console.error("Home feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch home feed" },
      { status: 500 }
    );
  }
}
