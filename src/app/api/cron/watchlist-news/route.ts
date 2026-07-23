// api/cron/watchlist-news/route.ts
// Cron: fetch fresh news for tickers that appear in users' watchlists and
// push each article to the users watching that ticker ("Watchlist Alerts" in
// Settings → Notifications, category `watchlist`).
//
// Until this cron existed the watchlist-alert pipeline had NO producer — the
// only sender was the manual admin endpoint (send-watchlist-alert), so the
// Settings toggle controlled a category that never fired.
//
// Push-only (like market-news): no per-user Notification rows are created —
// a popular ticker can have hundreds of watchers and per-watcher rows would
// bloat the hottest table. Taps deep-link via data.type='watchlist_alert'
// (set by sendPushNotificationToWatchlistUsers) → symbol chart screen.

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPushNotificationToWatchlistUsers } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FMP_API_KEY = process.env.FMP_API_KEY;

const RECENCY_WINDOW_MS = 3 * 60 * 60 * 1000; // 3h lookback (cron runs ~2h apart; dedup handles overlap)
const MAX_SENDS_PER_RUN = 8;   // global cap per run — keeps a busy news day from spamming
const TICKER_BATCH = 50;       // tickers per FMP stock_news request
const PUSH_TTL_SECONDS = 4 * 60 * 60; // undelivered pushes expire — no stale headlines at midnight

interface NewsArticle {
  symbol: string;
  publishedDate: string; // "2026-07-23 12:34:56" (ET, no timezone suffix from FMP)
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '');
const hashUrl = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 24);

// FMP timestamps are US/Eastern without an offset. Parse as ET (approximate
// with -04:00; the 1h DST drift is absorbed by the 3h recency window).
function parsePublishedMs(published: string): number {
  const iso = published.replace(' ', 'T') + '-04:00';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export async function GET(req: NextRequest) {
  try {
    // Cron auth — same fail-closed pattern as price-alerts/check.
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = !!req.headers.get('x-vercel-cron');
    const secretOk = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
    if (!isVercelCron && !secretOk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 500 });
    }

    // Every ticker present in at least one watchlist.
    const rows = await prisma.watchlistItem.findMany({
      distinct: ['ticker'],
      select: { ticker: true },
    });
    const tickers = rows.map((r) => r.ticker.toUpperCase()).filter((t) => /^[A-Z.-]{1,6}$/.test(t));

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, message: 'No watchlisted tickers', sent: 0 });
    }

    // Fetch news in ticker batches.
    const now = Date.now();
    const fresh: NewsArticle[] = [];
    for (let i = 0; i < tickers.length; i += TICKER_BATCH) {
      const batch = tickers.slice(i, i + TICKER_BATCH);
      try {
        const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${batch.join(',')}&limit=100&apikey=${FMP_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const articles: NewsArticle[] = await res.json();
        if (!Array.isArray(articles)) continue;
        for (const a of articles) {
          if (!a?.url || !a?.title || !a?.symbol) continue;
          if (now - parsePublishedMs(a.publishedDate) <= RECENCY_WINDOW_MS) {
            fresh.push(a);
          }
        }
      } catch (e) {
        console.error('watchlist-news: FMP batch failed', e);
      }
    }

    // Newest article per ticker (one push per ticker per run).
    const byTicker = new Map<string, NewsArticle>();
    for (const a of fresh.sort((x, y) => parsePublishedMs(y.publishedDate) - parsePublishedMs(x.publishedDate))) {
      const sym = a.symbol.toUpperCase();
      if (!byTicker.has(sym)) byTicker.set(sym, a);
    }

    const sentResults: Array<{ ticker: string; title: string; recipients: number }> = [];

    for (const [ticker, article] of byTicker) {
      if (sentResults.length >= MAX_SENDS_PER_RUN) break;

      // Dedup per (ticker, article) — the same article can cover several
      // tickers with distinct watcher audiences, so the ticker is part of the key.
      const externalId = `${ticker}:${hashUrl(article.url)}`;
      const existing = await prisma.sentNotification.findUnique({
        where: { type_externalId: { type: 'watchlist_news', externalId } },
      });
      if (existing) continue;

      const title = `⭐ ${ticker}: ${truncate(article.title, 55)}`;
      const body = truncate(article.text, 120);

      const result = await sendPushNotificationToWatchlistUsers(
        ticker,
        title,
        body,
        { url: article.url, source: article.site },
        { ttl: PUSH_TTL_SECONDS, image: article.image || undefined }
      );

      try {
        await prisma.sentNotification.create({
          data: {
            type: 'watchlist_news',
            externalId,
            title,
            recipientCount: result.sent ?? null,
          },
        });
      } catch (e: any) {
        if (e.code === 'P2002') continue; // concurrent run already recorded it
        throw e;
      }

      if (result.usersNotified > 0) {
        sentResults.push({ ticker, title, recipients: result.sent });
      }
    }

    return NextResponse.json({
      success: true,
      watchedTickers: tickers.length,
      freshArticles: fresh.length,
      sent: sentResults.length,
      results: sentResults,
    });
  } catch (error) {
    console.error('Error in watchlist-news cron:', error);
    return NextResponse.json({ error: 'watchlist-news cron failed' }, { status: 500 });
  }
}
