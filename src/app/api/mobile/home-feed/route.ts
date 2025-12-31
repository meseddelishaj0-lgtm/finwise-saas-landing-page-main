// api/mobile/home-feed/route.ts
// Combined endpoint for mobile app home screen - reduces multiple API calls to one
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Use Edge Runtime for faster response (Vercel Pro)

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
              isVerified: true
            }
          },
          forum: { select: { id: true, title: true, slug: true } },
          _count: { select: { comments: true, likes: true } },
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
    ]);

    // Add cache headers for Vercel Edge Network (cache for 30 seconds, revalidate in background)
    const response = NextResponse.json({
      posts: recentPosts,
      notificationsCount: notifications,
      unreadMessagesCount,
      cachedAt: new Date().toISOString(),
    });

    // Stale-while-revalidate: serve cached for 30s, revalidate in background for up to 60s
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60'
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
