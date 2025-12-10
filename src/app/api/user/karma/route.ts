// api/user/karma/route.ts
// Karma/reputation system
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/karma?userId=123 - Get user's karma
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: {
        karma: true,
        isVerified: true,
        verifiedBadge: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            followers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate karma level
    const karma = user.karma || 0;
    let level = 'Newcomer';
    let nextLevel = 100;
    
    if (karma >= 10000) {
      level = 'Legend';
      nextLevel = karma;
    } else if (karma >= 5000) {
      level = 'Expert';
      nextLevel = 10000;
    } else if (karma >= 1000) {
      level = 'Pro';
      nextLevel = 5000;
    } else if (karma >= 500) {
      level = 'Regular';
      nextLevel = 1000;
    } else if (karma >= 100) {
      level = 'Active';
      nextLevel = 500;
    }

    return NextResponse.json({
      karma,
      level,
      nextLevel,
      progress: Math.min(100, Math.round((karma / nextLevel) * 100)),
      isVerified: user.isVerified,
      verifiedBadge: user.verifiedBadge,
      stats: user._count,
    });
  } catch (error) {
    console.error("Error fetching karma:", error);
    return NextResponse.json({ error: "Failed to fetch karma" }, { status: 500 });
  }
}
