import { NextResponse } from "next/server";
import { getQuotes, tdSafe } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Crypto dashboard feed, backed by Twelve Data.
//
// Two things FMP's `quotes/crypto` had that Twelve Data does not sell on any
// plan: **market capitalisation** and **24h volume** for a coin. The /quote
// payload for a pair (BTC/USD) carries open/high/low/close, previous close,
// percent change and the 52-week range — nothing else. Rather than invent a
// number, those two fields come back as `null` and the page renders "—".
//
// Because there is no market cap, "top 20 by market cap" cannot be computed
// either. The display order below is an editorial ranking of the majors; every
// symbol in it is validated against the live `cryptocurrencies` catalog before
// it is quoted, so nothing is shown that Twelve Data does not actually carry.

/** Conventional major-coin ordering. Filtered against the live catalog. */
const MAJORS = [
  "BTC/USD", "ETH/USD", "XRP/USD", "BNB/USD", "SOL/USD", "DOGE/USD",
  "ADA/USD", "TRX/USD", "LINK/USD", "AVAX/USD", "XLM/USD", "SUI/USD",
  "BCH/USD", "HBAR/USD", "LTC/USD", "TON/USD", "DOT/USD", "UNI/USD",
  "AAVE/USD", "NEAR/USD", "APT/USD", "ETC/USD", "ATOM/USD", "ALGO/USD",
  "ARB/USD", "OP/USD", "FIL/USD", "INJ/USD",
];

const LIMIT = 24;

interface CatalogRow {
  symbol: string;
  currency_base?: string;
  currency_quote?: string;
  available_exchanges?: string[];
}

let cache: { data: unknown; ts: number } | null = null;
const TTL = 30 * 1000;

/**
 * The USD-quoted universe Twelve Data actually carries, keyed by pair symbol.
 * Cached hard: the catalog changes rarely and is a large payload.
 */
async function usdUniverse(): Promise<Map<string, CatalogRow>> {
  const raw = await tdSafe<{ data?: CatalogRow[] }>(
    "cryptocurrencies",
    { currency_quote: "USD" },
    { ttl: 12 * 60 * 60_000 }
  );
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  return new Map(rows.map((r) => [String(r.symbol).toUpperCase(), r]));
}

// ✅ GET → live crypto market data
export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  }

  try {
    const universe = await usdUniverse();
    // Fall back to the editorial list if the catalog call failed, so a catalog
    // outage degrades to "quotes still work" rather than an empty table.
    const symbols = universe.size
      ? MAJORS.filter((s) => universe.has(s)).slice(0, LIMIT)
      : MAJORS.slice(0, LIMIT);

    const quotes = await getQuotes(symbols, { ttl: 20_000 });
    if (quotes.length === 0) throw new Error("no crypto quotes");

    const cryptos = quotes.map((q) => {
      const meta = universe.get(q.symbol);
      return {
        symbol: q.symbol,
        name: meta?.currency_base || q.name || q.symbol,
        price: q.price.toFixed(q.price >= 1 ? 2 : 6),
        changes24h: q.changesPercentage.toFixed(2),
        // No Twelve Data source for either of these on any plan.
        marketCap: null,
        volume: null,
        dayLow: q.dayLow,
        dayHigh: q.dayHigh,
        yearLow: q.yearLow,
        yearHigh: q.yearHigh,
        exchange: q.exchange,
      };
    });

    cache = { data: cryptos, ts: Date.now() };
    return NextResponse.json(cryptos, {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  } catch (err) {
    console.error("Crypto API Error:", err);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { error: "Failed to fetch crypto data" },
      { status: 502 }
    );
  }
}

// ✅ POST → AI-powered crypto insights (unchanged; not a market-data call)
export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Missing crypto name or symbol" },
        { status: 400 }
      );
    }

    const prompt = `
Provide a professional, concise crypto analysis for ${topic}.
Include:
1. What it does and its main use case.
2. Tokenomics (supply, burn, staking, etc.).
3. Market sentiment and recent trends.
4. Key risks and challenges.
Keep it factual and engaging for investors.
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await aiRes.json();
    const result =
      data?.choices?.[0]?.message?.content || "No insights available.";

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Crypto AI Error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 }
    );
  }
}
