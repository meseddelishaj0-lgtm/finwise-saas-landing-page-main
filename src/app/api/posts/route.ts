// api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from '@/lib/mobileAuth';
import { Prisma } from "@/generated/prisma/client/client";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/posts - Get all posts (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forumSlug = searchParams.get("forum");
    const userId = searchParams.get("userId");
    const currentUserId = searchParams.get("currentUserId");
    // Paginate — the feed was an unbounded findMany (returned every post).
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

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
        forum: { select: { id: true, title: true, slug: true } },
        _count: { select: { comments: true, likes: true, sentiments: true, reposts: true } },
        tickerMentions: { select: { ticker: true } },
        sentiments: currentUserId ? {
          where: { userId: parseInt(currentUserId, 10) },
          select: { type: true },
        } : false,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Everything the page needs besides the posts themselves. These five
    // lookups depend only on the page of posts, not on each other, so they
    // run together instead of one after another.
    const userIds = [...new Set(posts.map(p => p.userId))];
    const pageIds = posts.map(p => p.id);

    const [users, userLikes, pageRepostRows, userReposts, sentimentGroups] = await Promise.all([
      // Authors (raw query: always the current row, never a cached relation)
      userIds.length > 0
        ? prisma.$queryRaw<any[]>`
            SELECT id, name, username, "profileImage", karma, "isVerified", "subscriptionTier"
            FROM "User"
            WHERE id IN (${Prisma.join(userIds)})
          `
        : Promise.resolve([] as any[]),

      // Viewer's likes on this page
      currentUserId
        ? prisma.like.findMany({
            where: {
              userId: parseInt(currentUserId, 10),
              postId: { in: pageIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),

      // Reposts of this page's posts, newest first (for the "Reposted by" banner)
      prisma.repost.findMany({
        where: { postId: { in: pageIds } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, name: true } } },
      }),

      // Viewer's reposts on this page
      currentUserId
        ? prisma.repost.findMany({
            where: {
              userId: parseInt(currentUserId, 10),
              postId: { in: pageIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),

      // Sentiment split (bullish/bearish) for ALL posts in ONE grouped query,
      // rather than a per-post groupBy (was an N+1 over an unbounded post set).
      pageIds.length > 0
        ? prisma.sentiment.groupBy({
            by: ['postId', 'type'],
            where: { postId: { in: pageIds } },
            _count: { type: true },
          })
        : Promise.resolve([]),
    ]);

    const usersMap = new Map<number, any>();
    users.forEach(u => usersMap.set(u.id, u));

    // Attach fresh user data to posts
    const postsWithUsers = posts.map(post => ({
      ...post,
      user: usersMap.get(post.userId) || null,
    }));

    // Viewer's likes
    const userLikedPostIds = new Set<number>();
    userLikes.forEach(l => l.postId && userLikedPostIds.add(l.postId));

    // Latest reposter per post
    const latestReposterByPost = new Map<number, { id: number; username: string | null; name: string | null }>();
    for (const r of pageRepostRows) {
      if (!latestReposterByPost.has(r.postId)) latestReposterByPost.set(r.postId, r.user);
    }

    // Viewer's reposts
    const userRepostedPostIds = new Set<number>();
    userReposts.forEach(r => userRepostedPostIds.add(r.postId));

    const sentimentMap = new Map<number, { bullish: number; bearish: number }>();
    for (const g of sentimentGroups) {
      if (g.postId == null) continue;
      const e = sentimentMap.get(g.postId) || { bullish: 0, bearish: 0 };
      if (g.type === 'bullish') e.bullish = g._count.type;
      else if (g.type === 'bearish') e.bearish = g._count.type;
      sentimentMap.set(g.postId, e);
    }

    const postsWithSentiment = postsWithUsers.map((post) => {
      const s = sentimentMap.get(post.id) || { bullish: 0, bearish: 0 };
      return {
        ...post,
        tickers: post.tickerMentions.map(tm => tm.ticker),
        isLiked: userLikedPostIds.has(post.id),
        isReposted: userRepostedPostIds.has(post.id),
        latestRepostBy: latestReposterByPost.get(post.id) ?? null,
        sentiment: {
          bullish: s.bullish,
          bearish: s.bearish,
          total: s.bullish + s.bearish,
          userVote: post.sentiments?.[0]?.type || null,
        },
      };
    });


    const response = NextResponse.json(postsWithSentiment, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    const { title, content, forumId, userId, ticker, mediaUrl } = await req.json();
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) return NextResponse.json({ error: _auth.error }, { status: _auth.status });

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
        user: { select: { id: true, name: true, username: true, profileImage: true, subscriptionTier: true } },
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
