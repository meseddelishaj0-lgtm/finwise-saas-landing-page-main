import { NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 });
  }

  try {
    // Fetch all major Finnhub APIs at once
    const [
      quote,
      profile,
      metrics,
      financials,
      news,
      peers,
      sentiment,
      insider,
      earnings,
      candles,
    ] = await Promise.all([
      fetch(`${FINNHUB_BASE}/quote?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/financials-reported?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/company-news?symbol=${symbol}&from=2024-10-01&to=2025-10-16&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/peers?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/news-sentiment?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/insider-transactions?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/calendar/earnings?symbol=${symbol}&token=${API_KEY}`).then(r => r.json()),
      fetch(`${FINNHUB_BASE}/stock/candle?symbol=${symbol}&resolution=D&from=1697414400&to=1734307200&token=${API_KEY}`).then(r => r.json()),
    ]);

    const result = {
      symbol,
      // Base quote info
      current: quote.c,
      open: quote.o,
      high: quote.h,
      low: quote.l,
      prevClose: quote.pc,
      change: (quote.c - quote.pc).toFixed(2),
      percentChange: (((quote.c - quote.pc) / quote.pc) * 100).toFixed(2),

      // Extended data
      profile,
      metrics: metrics.metric,
      financials,
      news: Array.isArray(news) ? news.slice(0, 5) : [],
      peers,
      sentiment,
      insider,
      earnings,
      candles,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Finnhub API error:", error);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}
