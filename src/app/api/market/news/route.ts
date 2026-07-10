import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Market news proxy (FMP stock_news), optionally filtered by ticker.
let cache: Record<string, { data: any; ts: number }> = {};
const TTL = 120 * 1000;

export async function GET(req: NextRequest) {
  const tickerRaw = req.nextUrl.searchParams.get("symbol") || "";
  const ticker = tickerRaw.toUpperCase().replace(/[^A-Z0-9.^/-]/g, "").slice(0, 12);
  const key = ticker || "general";

  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  try {
    const url = ticker
      ? `https://financialmodelingprep.com/api/v3/stock_news?tickers=${encodeURIComponent(ticker)}&limit=12&apikey=${process.env.FMP_API_KEY}`
      : `https://financialmodelingprep.com/api/v3/stock_news?limit=16&apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("bad upstream");

    const slim = data.map((n: any) => ({
      symbol: n.symbol,
      title: n.title,
      image: n.image,
      site: n.site,
      url: n.url,
      publishedDate: n.publishedDate,
      text: typeof n.text === "string" ? n.text.slice(0, 220) : "",
    }));

    if (Object.keys(cache).length > 40) cache = {};
    cache[key] = { data: slim, ts: Date.now() };
    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load news" }, { status: 502 });
  }
}
