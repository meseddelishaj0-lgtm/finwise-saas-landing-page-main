import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensures it runs in Node, not Edge

// Still on Financial Modeling Prep by design: Twelve Data has no news feed on
// any plan. Every other data source on the site moved to Twelve Data — see
// TWELVEDATA_MIGRATION.md.

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const baseUrl = "https://financialmodelingprep.com/api/v3/stock_news";
    const url = query
      ? `${baseUrl}?tickers=${encodeURIComponent(query)}&limit=30&apikey=${process.env.FMP_API_KEY}`
      : `${baseUrl}?limit=30&apikey=${process.env.FMP_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
