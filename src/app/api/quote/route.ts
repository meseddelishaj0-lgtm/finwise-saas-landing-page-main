import { NextResponse } from "next/server";
import { getQuote } from "@/lib/twelvedata";
import { getQuoteStats } from "@/lib/fmp";

export const runtime = "nodejs";

// Single quote lookup used by the portfolio page. Returns the same field
// names the page already reads: price fields from Twelve Data, valuation
// fields (best-effort) from an FMP quote.
export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ data: null });
    }

    const [quote, stats] = await Promise.all([
      getQuote(symbol),
      getQuoteStats([symbol]),
    ]);
    if (!quote) return NextResponse.json({ data: null });
    const s = stats[symbol.trim().toUpperCase()];

    return NextResponse.json({
      data: {
        ...quote,
        marketCap: s?.marketCap ?? null,
        pe: s?.pe ?? null,
        eps: s?.eps ?? null,
        priceAvg50: s?.priceAvg50 ?? null,
        priceAvg200: s?.priceAvg200 ?? null,
        sharesOutstanding: s?.sharesOutstanding ?? null,
      },
    });
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json({ data: null }, { status: 500 });
  }
}
