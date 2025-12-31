// api/trending/route.ts
// Trending tickers like StockTwits - with Vercel KV caching
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Edge Runtime for faster response

const CACHE_TTL = 60; // Cache trending data for 60 seconds

// GET /api/trending - Get trending tickers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const timeframe = searchParams.get("timeframe") || "24h";

    // Check KV cache first
    const cacheKey = `trending:${timeframe}:${limit}`;
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        const response = NextResponse.json(cached);
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
        return response;
      }
    } catch (cacheError) {
      console.warn('KV cache read error:', cacheError);
    }

    // Calculate the time threshold
    let timeThreshold = new Date();
    switch (timeframe) {
      case "1h":
        timeThreshold.setHours(timeThreshold.getHours() - 1);
        break;
      case "24h":
        timeThreshold.setHours(timeThreshold.getHours() - 24);
        break;
      case "7d":
        timeThreshold.setDate(timeThreshold.getDate() - 7);
        break;
      default:
        timeThreshold.setHours(timeThreshold.getHours() - 24);
    }

    // Get ticker mentions within timeframe
    const tickerMentions = await prisma.tickerMention.groupBy({
      by: ['ticker'],
      where: {
        createdAt: { gte: timeThreshold },
      },
      _count: { ticker: true },
      orderBy: { _count: { ticker: 'desc' } },
      take: limit,
    });

    // Get sentiment for each ticker
    const trendingTickers = await Promise.all(
      tickerMentions.map(async (tm) => {
        // Get posts with this ticker
        const postsWithTicker = await prisma.tickerMention.findMany({
          where: {
            ticker: tm.ticker,
            createdAt: { gte: timeThreshold },
          },
          select: { postId: true },
        });

        const postIds = postsWithTicker.map(p => p.postId);

        // Get sentiment for these posts
        const sentiments = await prisma.sentiment.groupBy({
          by: ['type'],
          where: { postId: { in: postIds } },
          _count: { type: true },
        });

        const bullish = sentiments.find(s => s.type === 'bullish')?._count.type || 0;
        const bearish = sentiments.find(s => s.type === 'bearish')?._count.type || 0;
        const total = bullish + bearish;

        return {
          ticker: tm.ticker,
          mentionCount: tm._count.ticker,
          bullish,
          bearish,
          sentiment: total > 0 ? ((bullish - bearish) / total) : 0, // -1 to 1
          bullishPercent: total > 0 ? Math.round((bullish / total) * 100) : 50,
        };
      })
    );

    // Cache result in KV (fire and forget)
    kv.set(cacheKey, trendingTickers, { ex: CACHE_TTL }).catch((err) => {
      console.warn('KV cache write error:', err);
    });

    const response = NextResponse.json(trendingTickers);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error("Error fetching trending:", error);
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
