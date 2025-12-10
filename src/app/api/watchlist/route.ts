// api/watchlist/route.ts
// User watchlist for tracking stocks
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/watchlist?userId=123 - Get user's watchlist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: parseInt(userId, 10) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

// POST /api/watchlist - Add ticker to watchlist
export async function POST(req: NextRequest) {
  try {
    const { userId, ticker, notes } = await req.json();

    if (!userId || !ticker) {
      return NextResponse.json(
        { error: "userId and ticker are required" },
        { status: 400 }
      );
    }

    const normalizedTicker = ticker.toUpperCase().replace('$', '');

    // Check if already in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_ticker: {
          userId: parseInt(userId, 10),
          ticker: normalizedTicker,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ticker already in watchlist", item: existing },
        { status: 409 }
      );
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: parseInt(userId, 10),
        ticker: normalizedTicker,
        notes: notes || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

// DELETE /api/watchlist - Remove ticker from watchlist
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const ticker = searchParams.get("ticker");

    if (!userId || !ticker) {
      return NextResponse.json(
        { error: "userId and ticker are required" },
        { status: 400 }
      );
    }

    const normalizedTicker = ticker.toUpperCase().replace('$', '');

    await prisma.watchlistItem.delete({
      where: {
        userId_ticker: {
          userId: parseInt(userId, 10),
          ticker: normalizedTicker,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
