// api/cron/daily-recap/route.ts
// Sends a daily market recap notification at market close (4:30 PM ET)
// Summary includes major indices, top gainer, top loser

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToAllSubscribers } from '@/lib/onesignal';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FMP_API_KEY = process.env.FMP_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function getIndexLabel(symbol: string): string {
  const labels: Record<string, string> = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow',
    '^IXIC': 'Nasdaq',
    '^RUT': 'Russell 2000',
    '^VIX': 'VIX',
  };
  return labels[symbol] || symbol;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
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

    const today = getTodayDateString();

    // Dedup: only send one recap per day
    const existing = await prisma.sentNotification.findUnique({
      where: { type_externalId: { type: 'daily_recap', externalId: today } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already sent daily recap today',
        sent: false,
      });
    }

    // Fetch major indices and top movers in parallel
    const [indicesRes, gainersRes, losersRes] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/quote/%5EGSPC,%5EDJI,%5EIXIC?apikey=${FMP_API_KEY}`,
        { cache: 'no-store' }
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_API_KEY}`,
        { cache: 'no-store' }
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_API_KEY}`,
        { cache: 'no-store' }
      ),
    ]);

    const [indices, gainers, losers]: [IndexQuote[], MarketMover[], MarketMover[]] =
      await Promise.all([indicesRes.json(), gainersRes.json(), losersRes.json()]);

    if (!Array.isArray(indices) || indices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch index data',
      }, { status: 500 });
    }

    // Build index summary: "S&P 500 +1.2%, Dow +0.8%, Nasdaq +1.5%"
    const indexSummary = indices
      .map(i => `${getIndexLabel(i.symbol)} ${formatPct(i.changesPercentage)}`)
      .join(', ');

    // Get top gainer and loser (skip penny stocks)
    const topGainer = Array.isArray(gainers)
      ? gainers.find(s => s.price >= 1.0)
      : null;
    const topLoser = Array.isArray(losers)
      ? losers.find(s => s.price >= 1.0)
      : null;

    // Determine overall market direction
    const sp500 = indices.find(i => i.symbol === '^GSPC');
    const marketDirection = sp500
      ? sp500.changesPercentage >= 0 ? 'up' : 'down'
      : 'mixed';

    const marketEmoji = marketDirection === 'up' ? '📈' : marketDirection === 'down' ? '📉' : '📊';

    // Compose notification
    const title = `${marketEmoji} Market Recap: ${sp500 ? `S&P 500 ${formatPct(sp500.changesPercentage)}` : 'Daily Summary'}`;

    let bodyParts = [indexSummary];
    if (topGainer) {
      bodyParts.push(`Top gainer: ${topGainer.symbol} ${formatPct(topGainer.changesPercentage)}`);
    }
    if (topLoser) {
      bodyParts.push(`Top loser: ${topLoser.symbol} ${formatPct(topLoser.changesPercentage)}`);
    }
    const body = bodyParts.join('. ');

    // Send via OneSignal
    const result = await sendToAllSubscribers(title, body, {
      type: 'daily_recap',
    });

    // Record in SentNotification
    await prisma.sentNotification.create({
      data: {
        type: 'daily_recap',
        externalId: today,
        title: `${title}: ${body}`,
        recipientCount: result?.recipients ?? null,
        onesignalId: result?.id ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      sent: true,
      title,
      body,
      indices: indices.map(i => ({
        name: getIndexLabel(i.symbol),
        change: formatPct(i.changesPercentage),
        price: i.price,
      })),
      topGainer: topGainer ? { symbol: topGainer.symbol, change: formatPct(topGainer.changesPercentage) } : null,
      topLoser: topLoser ? { symbol: topLoser.symbol, change: formatPct(topLoser.changesPercentage) } : null,
      recipients: result?.recipients ?? 0,
      onesignalId: result?.id ?? null,
    });
  } catch (error) {
    console.error('Daily recap cron error:', error);
    return NextResponse.json(
      { error: 'Daily recap cron failed', details: String(error) },
      { status: 500 }
    );
  }
}
