// api/cron/daily-recap/route.ts
// Sends a daily market recap notification at market close (4:30 PM ET)
// Summary includes major indices, top gainer, top loser
//
// Backed by @/lib/twelvedata: movers from Twelve Data, index quotes (served
// from FMP inside the client) at their real levels. The recap copy is phrased
// as percent moves.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToAllSubscribers } from '@/lib/onesignal';
import { getQuotes, getMovers } from '@/lib/twelvedata';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const INDEX_SYMBOLS = ['^GSPC', '^DJI', '^IXIC'];

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

    if (!TWELVE_DATA_API_KEY) {
      return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not configured' }, { status: 500 });
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

    // Fetch major indices and top movers in parallel. Every helper degrades to
    // an empty array instead of throwing, so one bad upstream call cannot take
    // the cron down or half-build a notification.
    const [indices, gainers, losers] = await Promise.all([
      getQuotes(INDEX_SYMBOLS, { ttl: 0 }),
      // priceGreaterThan: 1 keeps the same penny-stock floor the route applies
      // below, rather than the client's stricter $3 default.
      getMovers('gainers', { outputsize: 30, priceGreaterThan: 1 }),
      getMovers('losers', { outputsize: 30, priceGreaterThan: 1 }),
    ]);

    if (indices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch index data',
      }, { status: 500 });
    }

    // Build index summary: "S&P 500 +1.2%, Dow +0.8%, Nasdaq +1.5%"
    const indexSummary = indices
      .map(i => `${getIndexLabel(i.symbol)} ${formatPct(i.changesPercentage)}`)
      .join(', ');

    // Nothing meaningful to say → don't push an empty-bodied notification.
    if (!indexSummary) {
      return NextResponse.json({
        success: false,
        error: 'No index data to summarise',
      }, { status: 500 });
    }

    // Get top gainer and loser (skip penny stocks)
    const topGainer = gainers.find(s => s.price >= 1.0) ?? null;
    const topLoser = losers.find(s => s.price >= 1.0) ?? null;

    // Determine overall market direction
    const sp500 = indices.find(i => i.symbol === '^GSPC');
    const marketDirection = sp500
      ? sp500.changesPercentage >= 0 ? 'up' : 'down'
      : 'mixed';

    const marketEmoji = marketDirection === 'up' ? '📈' : marketDirection === 'down' ? '📉' : '📊';

    // Compose notification — headline leads with the S&P's percent move.
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
    }, { category: 'daily_recap' });

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
        price: i.price,
        change: formatPct(i.changesPercentage),
        changePercent: i.changesPercentage,
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
