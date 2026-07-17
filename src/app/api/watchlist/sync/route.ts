// src/app/api/watchlist/sync/route.ts
// Whole-watchlist sync for the mobile app (same pattern as
// /api/portfolio/sync): GET returns the account's tickers in insert
// order, POST replaces them. The app's per-action add/remove writes
// keep the server warm; this endpoint heals drift and restores the
// list on reinstall or a new device.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveMobileUserId } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const MAX_TICKERS = 200;

function getUserId(req: NextRequest): number | null {
  // Backward-compatible shim kept for callers below; identity is resolved from
  // the signed token when present, falling back to x-user-id (see mobileAuth).
  const resolved = resolveMobileUserId(req, req.headers.get('x-user-id'));
  return resolved.ok ? resolved.userId : null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      select: { ticker: true },
    });
    return NextResponse.json({ tickers: items.map((i) => i.ticker) });
  } catch (err) {
    console.error('watchlist sync GET error:', err);
    return NextResponse.json({ error: 'Failed to load watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    if (!Array.isArray(body?.tickers)) {
      return NextResponse.json({ error: 'tickers array required' }, { status: 400 });
    }
    const seen = new Set<string>();
    const tickers: string[] = body.tickers
      .slice(0, MAX_TICKERS)
      .map((t: any) => String(t || '').toUpperCase().slice(0, 12))
      .filter((t: string) => {
        if (!/^[A-Z0-9^./-]{1,12}$/.test(t) || seen.has(t)) return false;
        seen.add(t);
        return true;
      });

    await prisma.$transaction([
      prisma.watchlistItem.deleteMany({ where: { userId } }),
      prisma.watchlistItem.createMany({
        data: tickers.map((ticker) => ({ userId, ticker })),
      }),
    ]);

    return NextResponse.json({ success: true, count: tickers.length });
  } catch (err) {
    console.error('watchlist sync POST error:', err);
    return NextResponse.json({ error: 'Failed to save watchlist' }, { status: 500 });
  }
}
