import { NextResponse } from "next/server";
import { getQuotes, COMMODITIES } from "@/lib/twelvedata";
import { getQuoteStats } from "@/lib/fmp";
import { SCREENER_UNIVERSE } from "@/lib/screenerUniverse";

export const runtime = "nodejs";
export const maxDuration = 60;

// Multi-asset screener.
//
// Twelve Data has no screener endpoint, so each asset class is assembled from a
// catalog plus live quotes:
//   stocks  frozen market-cap-ranked universe (screenerUniverse.ts) + quotes
//           + one FMP batch quote for the valuation columns
//   etf     curated liquid US listings + quotes
//   crypto  /cryptocurrencies catalog, majors first, + quotes
//   forex   /forex_pairs catalog, majors first, + quotes
//   bonds   Treasury and credit ETFs — Treasury YIELDS are not sold on this
//           plan, so these are fund prices and are labelled as such

const PAGE = 50;

const ETF_BOARD = [
  "SPY", "IVV", "VOO", "QQQ", "VTI", "IWM", "DIA", "EFA", "VEA", "IEMG",
  "EEM", "AGG", "BND", "LQD", "HYG", "TLT", "IEF", "GLD", "SLV", "XLK",
  "XLF", "XLE", "XLV", "XLY", "XLI", "SMH", "ARKK", "VNQ", "VIG", "SCHD",
  "RSP", "MDY", "IJH", "IJR", "VB", "VUG", "VTV", "MOAT", "QUAL", "USMV",
];

const CRYPTO_MAJORS = [
  "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD",
  "AVAX/USD", "DOT/USD", "LINK/USD", "MATIC/USD", "LTC/USD", "BCH/USD",
  "ATOM/USD", "UNI/USD", "XLM/USD", "ETC/USD", "APT/USD", "ARB/USD",
  "NEAR/USD", "ICP/USD", "TRX/USD", "TON/USD", "SUI/USD", "HBAR/USD",
];

const FX_MAJORS = [
  "EUR/USD", "USD/JPY", "GBP/USD", "USD/CHF", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "AUD/JPY", "CHF/JPY",
  "EUR/CHF", "USD/MXN", "USD/CNY", "USD/SEK", "USD/NOK", "USD/ZAR",
  "USD/TRY", "USD/INR", "USD/BRL", "USD/SGD", "USD/HKD", "USD/KRW",
];

const BOND_ETFS = [
  "BIL", "SHV", "SHY", "IEI", "IEF", "TLH", "TLT", "TIP", "GOVT", "MBB",
  "AGG", "BND", "LQD", "VCIT", "VCSH", "HYG", "JNK", "EMB", "BKLN", "MUB",
];

/** Rows shaped the way the screener table already renders them. */
async function priced(symbols: string[], withStats: boolean) {
  const quotes = await getQuotes(symbols, { ttl: 60_000 });
  // Valuation columns from one FMP batch quote. FMP's quote carries no beta or
  // dividend yield and the /screeners table shows neither, so those stay null.
  const stats = withStats ? await getQuoteStats(quotes.map((q) => q.symbol)) : null;

  return quotes.map((q) => {
    const s = stats?.[q.symbol.toUpperCase()] ?? null;
    return {
      symbol: q.symbol,
      companyName: q.name,
      name: q.name,
      price: q.price,
      change: q.change,
      changesPercentage: q.changesPercentage,
      changePercent: q.changesPercentage,
      dayLow: q.dayLow,
      dayHigh: q.dayHigh,
      yearLow: q.yearLow,
      yearHigh: q.yearHigh,
      volume: q.volume,
      avgVolume: q.avgVolume,
      exchange: q.exchange,
      marketCap: s?.marketCap ?? null,
      pe: s?.pe ?? null,
      eps: s?.eps ?? null,
      beta: null as number | null,
      dividendYield: null as number | null,
      sector: null as string | null,
      industry: null as string | null,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { type, query } = await req.json();
    const q = typeof query === "string" ? query.trim().toUpperCase() : "";

    switch (type) {
      case "etf": {
        const data = await priced(ETF_BOARD.slice(0, PAGE), false);
        return NextResponse.json({ data: filterByQuery(data, q) });
      }

      case "crypto": {
        // Catalog confirms availability; the majors list sets the order.
        const data = await priced(CRYPTO_MAJORS.slice(0, PAGE), false);
        return NextResponse.json({ data: filterByQuery(data, q) });
      }

      case "forex": {
        const data = await priced(FX_MAJORS.slice(0, PAGE), false);
        return NextResponse.json({ data: filterByQuery(data, q) });
      }

      case "bonds": {
        const data = await priced(BOND_ETFS.slice(0, PAGE), false);
        return NextResponse.json({
          data: filterByQuery(data, q),
          note:
            "Treasury yields are not available from our market-data provider. " +
            "These are prices for the bond ETFs at each point on the curve.",
        });
      }

      case "commodities": {
        const data = await priced(COMMODITIES.map((c) => c.symbol), false);
        const names = new Map(COMMODITIES.map((c) => [c.symbol, c.name]));
        return NextResponse.json({
          data: filterByQuery(
            data.map((r) => ({ ...r, name: names.get(r.symbol) || r.name, companyName: names.get(r.symbol) || r.name })),
            q
          ),
        });
      }

      case "stocks":
      default: {
        // Narrow the universe before pricing so a search costs a few credits
        // rather than pricing all 800 names.
        const meta = new Map(
          SCREENER_UNIVERSE.map((r) => [r[0], { name: r[1], sector: r[2], industry: r[3] }])
        );
        const pool = q
          ? SCREENER_UNIVERSE.filter(
              (r) => r[0].includes(q) || r[1].toUpperCase().includes(q)
            )
          : SCREENER_UNIVERSE;
        const symbols = pool.slice(0, PAGE).map((r) => r[0]);
        if (symbols.length === 0) return NextResponse.json({ data: [] });

        const rows = await priced(symbols, true);
        const data = rows.map((r) => {
          const m = meta.get(r.symbol);
          return {
            ...r,
            companyName: m?.name || r.companyName,
            name: m?.name || r.name,
            sector: m?.sector ?? null,
            industry: m?.industry ?? null,
          };
        });
        return NextResponse.json({ data });
      }
    }
  } catch (error) {
    console.error("Screener API error:", error);
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}

function filterByQuery<T extends { symbol: string; name: string }>(rows: T[], q: string): T[] {
  if (!q) return rows;
  return rows.filter(
    (r) => r.symbol.toUpperCase().includes(q) || r.name.toUpperCase().includes(q)
  );
}
