// src/app/api/portfolio/sync/route.ts
// Whole-portfolio sync for the mobile app. The app keeps a local copy for
// instant loads/offline and mirrors it here so portfolios survive
// reinstalls and follow the account across devices.
//
//   GET  → { portfolios: [{ name, isDefault, holdings: [{symbol, shares, avgCost}] }], updatedAt }
//   POST → replaces the user's portfolios with the payload (last write wins)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_PORTFOLIOS = 20;
const MAX_HOLDINGS = 200;

function getUserId(req: NextRequest): number | null {
  const raw = req.headers.get('x-user-id');
  const id = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: { holdings: true },
      orderBy: { createdAt: 'asc' },
    });

    let updatedAt: Date | null = null;
    for (const p of portfolios) {
      if (!updatedAt || p.updatedAt > updatedAt) updatedAt = p.updatedAt;
      for (const h of p.holdings) {
        if (h.updatedAt > updatedAt) updatedAt = h.updatedAt;
      }
    }

    return NextResponse.json({
      portfolios: portfolios.map((p) => ({
        name: p.name,
        isDefault: p.isDefault,
        holdings: p.holdings.map((h) => ({
          symbol: h.symbol,
          shares: h.shares,
          avgCost: h.avgCost,
        })),
      })),
      updatedAt: updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('portfolio sync GET error:', err);
    return NextResponse.json({ error: 'Failed to load portfolios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const incoming = Array.isArray(body?.portfolios) ? body.portfolios.slice(0, MAX_PORTFOLIOS) : null;
    if (!incoming) {
      return NextResponse.json({ error: 'portfolios array required' }, { status: 400 });
    }

    // Sanitize: valid symbols, positive numbers, de-duped per portfolio
    const clean = incoming.map((p: any, idx: number) => {
      const seen = new Set<string>();
      const holdings = (Array.isArray(p?.holdings) ? p.holdings : [])
        .slice(0, MAX_HOLDINGS)
        .map((h: any) => ({
          symbol: String(h?.symbol || '').toUpperCase().slice(0, 12),
          shares: Number(h?.shares),
          avgCost: Number(h?.avgCost),
        }))
        .filter((h: any) => {
          if (!/^[A-Z0-9^./-]{1,12}$/.test(h.symbol)) return false;
          if (!Number.isFinite(h.shares) || h.shares <= 0) return false;
          if (!Number.isFinite(h.avgCost) || h.avgCost < 0) return false;
          if (seen.has(h.symbol)) return false;
          seen.add(h.symbol);
          return true;
        });
      return {
        name: String(p?.name || `Portfolio ${idx + 1}`).slice(0, 60),
        isDefault: idx === 0,
        holdings,
      };
    });

    await prisma.$transaction([
      prisma.portfolio.deleteMany({ where: { userId } }),
      ...clean.map((p: any) =>
        prisma.portfolio.create({
          data: {
            userId,
            name: p.name,
            isDefault: p.isDefault,
            holdings: { create: p.holdings },
          },
        })
      ),
    ]);

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('portfolio sync POST error:', err);
    return NextResponse.json({ error: 'Failed to save portfolios' }, { status: 500 });
  }
}
