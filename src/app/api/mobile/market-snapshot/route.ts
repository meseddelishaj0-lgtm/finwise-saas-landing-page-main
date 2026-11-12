// api/mobile/market-snapshot/route.ts
// Every symbol the mobile app pre-loads at startup, in one response.
//
// The app used to fetch these itself: 16 back-to-back Twelve Data requests on
// every launch, costing 117 credits per launch from the shared 987/minute
// budget. This route does the same lookup once on the server and lets the CDN
// hand the result to everyone for the next few seconds, so launches cost no
// credits beyond the first in each window.
//
// The app (wallstreetstocks-app/services/marketDataService.ts) treats this as
// a fast path only: on any error, or a response that covers too little of a
// list, it falls back to its own direct requests. So this route must never
// answer 200 with a thin payload.
//
// The three lists mirror ALL_STOCKS / ALL_CRYPTO / ALL_ETFS in that file and
// must be kept in step with it. Items are in the app's own MarketItem shape,
// computed the same way its processQuoteData() does.

import { NextResponse } from "next/server";
import { td, type TdQuoteRaw } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

const STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "JNJ",
  "V", "XOM", "WMT", "JPM", "MA", "PG", "HD", "CVX", "MRK", "ABBV",
  "LLY", "PEP", "KO", "COST", "AVGO", "TMO", "MCD", "CSCO", "ACN", "ABT",
  "DHR", "NEE", "WFC", "LIN", "ADBE", "TXN", "CRM", "AMD", "PM", "ORCL",
  "BMY", "UPS", "RTX", "QCOM", "HON", "UNP", "INTC", "IBM", "CAT", "BA",
];

const CRYPTO = [
  "BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "ADA/USD", "SOL/USD", "DOGE/USD", "DOT/USD",
  "MATIC/USD", "LTC/USD", "SHIB/USD", "TRX/USD", "AVAX/USD", "LINK/USD", "ATOM/USD",
  "UNI/USD", "XLM/USD", "XMR/USD", "ETC/USD", "BCH/USD", "ALGO/USD", "VET/USD",
  "FIL/USD", "ICP/USD", "HBAR/USD", "MANA/USD", "SAND/USD", "AXS/USD", "THETA/USD",
  "XTZ/USD",
];

const ETFS = [
  "SPY", "VOO", "VTI", "QQQ", "IVV", "VEA", "IEFA", "VWO", "VTV", "IEMG",
  "BND", "AGG", "VUG", "IJR", "IWM", "VIG", "SCHD", "VYM", "VGT", "XLF",
  "XLK", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC",
  "ARKK", "DIA", "GLD", "SLV", "TLT", "LQD", "HYG",
];

// How long one upstream answer is reused inside this server instance.
const UPSTREAM_TTL_MS = 15_000;
// A list must come back at least this complete, or the app is better served
// by its own direct requests (it applies the same threshold).
const MIN_COVERAGE = 0.8;

type AssetType = "stock" | "crypto" | "etf";

interface SnapshotItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

// Twelve Data takes comma-separated symbols, but its response time grows with
// the batch (measured: ~1s for 8 symbols, ~3s for 30, ~6s for 60). Small
// batches sent together finish in about the time of one.
const CHUNK = 10;

// Raw quotes keyed by the symbol that was asked for. This deliberately does
// not go through getQuotes(): that helper asks for 5 decimal places, which
// rounds sub-cent coins (SHIB trades around $0.000004) to a price of zero.
// The app's own requests use full precision, so this does too.
async function fetchRawQuotes(symbols: string[]): Promise<Map<string, TdQuoteRaw>> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += CHUNK) chunks.push(symbols.slice(i, i + CHUNK));

  const results = await Promise.allSettled(
    chunks.map((chunk) =>
      td<Record<string, TdQuoteRaw> | TdQuoteRaw>(
        "quote",
        { symbol: chunk.join(",") },
        { ttl: UPSTREAM_TTL_MS, cost: chunk.length }
      )
    )
  );

  const out = new Map<string, TdQuoteRaw>();
  results.forEach((res, i) => {
    if (res.status !== "fulfilled" || !res.value) return;
    const chunk = chunks[i];
    // A single-symbol request returns the object directly, not keyed.
    const rows: Record<string, TdQuoteRaw> =
      chunk.length === 1
        ? { [chunk[0]]: res.value as TdQuoteRaw }
        : (res.value as Record<string, TdQuoteRaw>);

    for (const symbol of chunk) {
      const raw = rows?.[symbol] as (TdQuoteRaw & { status?: string; code?: number }) | undefined;
      // Twelve Data marks per-symbol failures inside a batch (e.g. a delisted pair).
      if (!raw || typeof raw !== "object" || raw.status === "error" || raw.code) continue;
      out.set(symbol, raw);
    }
  });
  return out;
}

// Same arithmetic as the app's processQuoteData(): the provider's own change
// figures first, derived from the previous close only when they are missing.
function toItem(requested: string, raw: TdQuoteRaw, type: AssetType): SnapshotItem {
  const symbol = type === "crypto" ? requested.replace("/", "") : requested;
  const price = parseFloat(raw.close ?? "") || 0;
  const previousClose = parseFloat(raw.previous_close ?? "") || price;
  const change = parseFloat(raw.change ?? "") || (previousClose > 0 ? price - previousClose : 0);
  const changePercent =
    parseFloat(raw.percent_change ?? "") ||
    (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0);

  return { symbol, name: raw.name || symbol, price, change, changePercent, previousClose };
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const bySymbol = await fetchRawQuotes([...STOCKS, ...CRYPTO, ...ETFS]);

    const build = (symbols: string[], type: AssetType): SnapshotItem[] => {
      const out: SnapshotItem[] = [];
      for (const s of symbols) {
        const raw = bySymbol.get(s);
        if (!raw) continue;
        const item = toItem(s, raw, type);
        if (item.price > 0) out.push(item);
      }
      return out;
    };

    const stocks = build(STOCKS, "stock");
    const crypto = build(CRYPTO, "crypto");
    const etfs = build(ETFS, "etf");

    const thin =
      stocks.length < STOCKS.length * MIN_COVERAGE ||
      crypto.length < CRYPTO.length * MIN_COVERAGE ||
      etfs.length < ETFS.length * MIN_COVERAGE;

    if (thin) {
      // Upstream trouble (rate limit, partial batch). Say so rather than let
      // the CDN serve half a market to every phone for the next 20 seconds.
      return NextResponse.json(
        {
          error: "Market snapshot incomplete",
          counts: { stocks: stocks.length, crypto: crypto.length, etfs: etfs.length },
        },
        { status: 503, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { stocks, crypto, etfs, ts: Date.now() },
      {
        headers: {
          // Shared by all users at the edge; never older than ~40s.
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=20",
        },
      }
    );
  } catch (err) {
    console.error("market-snapshot error:", err);
    return NextResponse.json({ error: "Market snapshot unavailable" }, { status: 502, headers: NO_STORE });
  }
}
