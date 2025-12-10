// api/sentiment/route.ts
// Bullish/Bearish voting like StockTwits
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/sentiment?postId=123 - Get sentiment for a post
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const userId = searchParams.get("userId");

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const sentiments = await prisma.sentiment.groupBy({
      by: ['type'],
      where: { postId: parseInt(postId, 10) },
      _count: { type: true },
    });

    const bullish = sentiments.find(s => s.type === 'bullish')?._count.type || 0;
    const bearish = sentiments.find(s => s.type === 'bearish')?._count.type || 0;
    const total = bullish + bearish;

    // Get user's vote if userId provided
    let userVote = null;
    if (userId) {
      const vote = await prisma.sentiment.findUnique({
        where: {
          userId_postId: {
            userId: parseInt(userId, 10),
            postId: parseInt(postId, 10),
          },
        },
      });
      userVote = vote?.type || null;
    }

    return NextResponse.json({
      bullish,
      bearish,
      total,
      bullishPercent: total > 0 ? Math.round((bullish / total) * 100) : 50,
      bearishPercent: total > 0 ? Math.round((bearish / total) * 100) : 50,
      userVote,
    });
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    return NextResponse.json({ error: "Failed to fetch sentiment" }, { status: 500 });
  }
}

// POST /api/sentiment - Vote bullish or bearish
export async function POST(req: NextRequest) {
  try {
    const { userId, postId, type } = await req.json();

    if (!userId || !postId || !type) {
      return NextResponse.json(
        { error: "userId, postId, and type are required" },
        { status: 400 }
      );
    }

    if (type !== 'bullish' && type !== 'bearish') {
      return NextResponse.json(
        { error: "type must be 'bullish' or 'bearish'" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const existingVote = await prisma.sentiment.findUnique({
      where: {
        userId_postId: {
          userId: parseInt(userId, 10),
          postId: parseInt(postId, 10),
        },
      },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        // Remove vote if same type
        await prisma.sentiment.delete({
          where: { id: existingVote.id },
        });
        return NextResponse.json({ action: 'removed', type: null });
      } else {
        // Change vote
        await prisma.sentiment.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return NextResponse.json({ action: 'changed', type });
      }
    }

    // Create new vote
    await prisma.sentiment.create({
      data: {
        userId: parseInt(userId, 10),
        postId: parseInt(postId, 10),
        type,
      },
    });

    // Award karma to post author
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId, 10) },
      select: { userId: true },
    });
    
    if (post && post.userId !== parseInt(userId, 10)) {
      await prisma.user.update({
        where: { id: post.userId },
        data: { karma: { increment: 1 } },
      });
    }

    return NextResponse.json({ action: 'added', type });
  } catch (error) {
    console.error("Error voting sentiment:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
