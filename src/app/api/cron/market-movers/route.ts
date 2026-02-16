// api/cron/market-movers/route.ts
// Cron job to detect big market movers and push notifications via OneSignal
// Runs every 30 min during market hours (Mon-Fri 9am-4pm ET)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToAllSubscribers } from '@/lib/onesignal';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FMP_API_KEY = process.env.FMP_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const CHANGE_THRESHOLD = 5.0; // minimum % change to qualify
const MIN_PRICE = 1.0; // skip penny stocks
const MAX_MOVERS_IN_NOTIFICATION = 5;

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      const vercelCron = req.headers.get('x-vercel-cron');
      if (!vercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 500 });
    }

    // Fetch gainers and losers from FMP
    const [gainersRes, losersRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_API_KEY}`),
    ]);

    const [gainers, losers]: [MarketMover[], MarketMover[]] = await Promise.all([
      gainersRes.json(),
      losersRes.json(),
    ]);

    if (!Array.isArray(gainers) || !Array.isArray(losers)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid FMP response',
      }, { status: 500 });
    }

    // Filter for significant movers
    const today = getTodayDateString();
    const bigMovers = [...gainers, ...losers]
      .filter(s =>
        Math.abs(s.changesPercentage) >= CHANGE_THRESHOLD &&
        s.price >= MIN_PRICE
      )
      .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
      .slice(0, MAX_MOVERS_IN_NOTIFICATION);

    if (bigMovers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No big movers found',
        sent: false,
      });
    }

    // Build a single dedup key for this batch
    const batchKey = bigMovers.map(m => m.symbol).sort().join(',') + `_${today}`;

    // Check if we already sent this exact batch today
    const existing = await prisma.sentNotification.findUnique({
      where: { type_externalId: { type: 'market_mover', externalId: batchKey } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already sent this batch today',
        sent: false,
        batchKey,
      });
    }

    // Also check if we sent ANY market mover notification in the last 25 min
    // to prevent flooding (cron runs every 30 min)
    const recentSent = await prisma.sentNotification.findFirst({
      where: {
        type: 'market_mover',
        sentAt: { gt: new Date(Date.now() - 25 * 60 * 1000) },
      },
    });

    if (recentSent) {
      return NextResponse.json({
        success: true,
        message: 'Recently sent a market mover notification, skipping',
        sent: false,
      });
    }

    // Compose notification
    const topMovers = bigMovers.slice(0, 4);
    const remaining = bigMovers.length - topMovers.length;

    const moverSummary = topMovers
      .map(m => `${m.symbol} ${formatChange(m.changesPercentage)}`)
      .join(', ');

    const title = bigMovers.length === 1
      ? `${bigMovers[0].symbol} ${formatChange(bigMovers[0].changesPercentage)}`
      : 'Big Market Movers';

    const body = remaining > 0
      ? `${moverSummary} and ${remaining} more`
      : moverSummary;

    // Send via OneSignal
    const result = await sendToAllSubscribers(title, body, {
      type: 'market_mover',
      symbols: bigMovers.map(m => m.symbol),
      symbol: bigMovers[0].symbol,
    });

    // Record in SentNotification
    await prisma.sentNotification.create({
      data: {
        type: 'market_mover',
        externalId: batchKey,
        title: `${title}: ${body}`,
        recipientCount: result?.recipients ?? null,
        onesignalId: result?.id ?? null,
      },
    });

    // Cleanup old records (older than 7 days)
    await prisma.sentNotification.deleteMany({
      where: { sentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    return NextResponse.json({
      success: true,
      sent: true,
      title,
      body,
      movers: bigMovers.map(m => ({
        symbol: m.symbol,
        change: formatChange(m.changesPercentage),
        price: m.price,
      })),
      recipients: result?.recipients ?? 0,
      onesignalId: result?.id ?? null,
    });
  } catch (error) {
    console.error('Market movers cron error:', error);
    return NextResponse.json(
      { error: 'Market movers cron failed', details: String(error) },
      { status: 500 }
    );
  }
}
