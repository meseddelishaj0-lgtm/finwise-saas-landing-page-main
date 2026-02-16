// api/cron/market-news/route.ts
// Cron job to fetch breaking market news and push via OneSignal
// Runs every 15 min, 24/7

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToAllSubscribers } from '@/lib/onesignal';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FMP_API_KEY = process.env.FMP_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const MAX_NEWS_PER_RUN = 2;
const RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // TEMP: 24 hours for testing
const MIN_IMPORTANCE_SCORE = 1; // TEMP: lowered for testing

interface NewsArticle {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

const HIGH_KEYWORDS = [
  'fed ', 'federal reserve', 'fomc', 'rate cut', 'rate hike', 'interest rate',
  'recession', 'crash', 'bear market', 'bull market', 'circuit breaker',
  'trading halt', 'market crash', 'black monday', 'inflation data',
  'jobs report', 'nonfarm payroll', 'cpi ', 'ppi ', 'gdp ',
];

const MEDIUM_KEYWORDS = [
  'earnings beat', 'earnings miss', 'earnings surprise', 'revenue beat',
  'sec ', 'ipo ', 'acquisition', 'merger', 'takeover', 'buyout',
  'layoffs', 'bankruptcy', 'investigation', 'fraud',
  'downgrade', 'upgrade', 'price target', 'guidance',
  'stock split', 'dividend', 'buyback', 'recall',
  'tariff', 'sanction', 'regulation',
];

const MEGA_CAP_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA',
  'BRK.A', 'BRK.B', 'JPM', 'V', 'UNH', 'MA', 'JNJ', 'WMT', 'XOM',
  'PG', 'HD', 'BAC', 'COST', 'AVGO', 'LLY', 'ABBV', 'KO', 'PEP',
  'MRK', 'CRM', 'AMD', 'NFLX', 'ADBE', 'ORCL', 'INTC', 'DIS',
];

function scoreNewsImportance(article: NewsArticle): number {
  let score = 0;
  const text = `${article.title} ${article.text}`.toLowerCase();

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) score += 3;
  }
  for (const kw of MEDIUM_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  if (article.symbol && MEGA_CAP_TICKERS.includes(article.symbol.toUpperCase())) {
    score += 2;
  }

  return score;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// Simple hash for dedup - uses URL as unique identifier
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
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

    // Check if we sent any news notification in the last 12 min
    const recentSent = await prisma.sentNotification.findFirst({
      where: {
        type: 'market_news',
        sentAt: { gt: new Date(Date.now() - 12 * 60 * 1000) },
      },
    });

    if (recentSent) {
      return NextResponse.json({
        success: true,
        message: 'Recently sent a news notification, skipping',
        sent: 0,
      });
    }

    // Fetch general market news
    const newsRes = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_news?limit=50&apikey=${FMP_API_KEY}`
    );
    const articles: NewsArticle[] = await newsRes.json();

    if (!Array.isArray(articles)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid FMP news response',
      }, { status: 500 });
    }

    const now = Date.now();

    // Filter to recent articles and score them
    const scoredArticles = articles
      .filter(a => {
        const publishedTime = new Date(a.publishedDate).getTime();
        return (now - publishedTime) <= RECENCY_WINDOW_MS;
      })
      .map(a => ({ article: a, score: scoreNewsImportance(a) }))
      .filter(a => a.score >= MIN_IMPORTANCE_SCORE)
      .sort((a, b) => b.score - a.score);

    if (scoredArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No important news found',
        sent: 0,
        articlesChecked: articles.length,
      });
    }

    const sentResults: Array<{ title: string; score: number; recipients: number }> = [];

    // Send top articles (max 2 per run)
    for (const { article, score } of scoredArticles.slice(0, MAX_NEWS_PER_RUN)) {
      const externalId = hashUrl(article.url);

      // Check if already sent
      const existing = await prisma.sentNotification.findUnique({
        where: { type_externalId: { type: 'market_news', externalId } },
      });

      if (existing) continue;

      const title = truncate(article.title, 65);
      const body = truncate(article.text, 120);

      const result = await sendToAllSubscribers(
        title,
        body,
        {
          type: 'market_news',
          url: article.url,
          symbol: article.symbol || null,
          source: article.site,
        },
        {
          image: article.image || undefined,
        }
      );

      // Record sent notification
      try {
        await prisma.sentNotification.create({
          data: {
            type: 'market_news',
            externalId,
            title,
            recipientCount: result?.recipients ?? null,
            onesignalId: result?.id ?? null,
          },
        });
      } catch (e: any) {
        // Unique constraint violation = already sent (race condition), skip
        if (e.code === 'P2002') continue;
        throw e;
      }

      sentResults.push({
        title,
        score,
        recipients: result?.recipients ?? 0,
      });
    }

    return NextResponse.json({
      success: true,
      sent: sentResults.length,
      articlesChecked: articles.length,
      recentArticles: scoredArticles.length,
      notifications: sentResults,
    });
  } catch (error) {
    console.error('Market news cron error:', error);
    return NextResponse.json(
      { error: 'Market news cron failed', details: String(error) },
      { status: 500 }
    );
  }
}
