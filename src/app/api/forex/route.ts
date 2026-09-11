import { NextResponse } from "next/server";
import { getQuotes, getExchangeRate, tdSafe } from "@/lib/twelvedata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forex board, backed by Twelve Data.
//
// The universe comes from the live `forex_pairs` catalog. Twelve Data lists
// ~1,400 pairs; a batch quote costs one credit per symbol, so the board is
// restricted to the Major and Minor currency groups (the ones the page can
// actually usefully show) and capped. `currency_group` is NOT a server-side
// filter on this endpoint — passing it returns the whole catalog — so the
// grouping is applied here.

const GROUPS = new Set(["Major", "Minor"]);
const MAX_PAIRS = 120;

interface PairRow {
  symbol: string;
  currency_group?: string;
  currency_base?: string;
  currency_quote?: string;
}

let cache: { data: unknown; ts: number } | null = null;
const TTL = 45 * 1000;

async function majorPairs(): Promise<PairRow[]> {
  const raw = await tdSafe<{ data?: PairRow[] }>(
    "forex_pairs",
    {},
    { ttl: 12 * 60 * 60_000 }
  );
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  const wanted = rows.filter((r) => GROUPS.has(String(r.currency_group)));
  // Majors first, then minors, so the cap never trims a major pair.
  wanted.sort((a, b) => {
    const rank = (g?: string) => (g === "Major" ? 0 : 1);
    return rank(a.currency_group) - rank(b.currency_group) ||
      a.symbol.localeCompare(b.symbol);
  });
  return wanted.slice(0, MAX_PAIRS);
}

async function board() {
  const pairs = await majorPairs();
  if (pairs.length === 0) return [];

  const meta = new Map(pairs.map((p) => [p.symbol.toUpperCase(), p]));
  const quotes = await getQuotes(pairs.map((p) => p.symbol), { ttl: 30_000 });

  return quotes.map((q) => {
    const m = meta.get(q.symbol);
    return {
      symbol: q.symbol,
      name: q.name || `${m?.currency_base ?? ""} / ${m?.currency_quote ?? ""}`.trim(),
      group: m?.currency_group ?? "",
      price: q.price,
      change: q.change,
      changesPercentage: q.changesPercentage,
      dayLow: q.dayLow,
      dayHigh: q.dayHigh,
      open: q.open,
      previousClose: q.previousClose,
      yearLow: q.yearLow,
      yearHigh: q.yearHigh,
      timestamp: q.timestamp,
    };
  });
}

export async function POST(req: Request) {
  try {
    // A single pair can be asked for directly; that path also returns the
    // dedicated exchange_rate reading, which is fresher than the quote close.
    let pair: string | undefined;
    try {
      const body = await req.json();
      pair = typeof body?.pair === "string" ? body.pair.toUpperCase() : undefined;
    } catch {
      /* no body — full board */
    }

    if (pair) {
      const [quotes, rate] = await Promise.all([
        getQuotes([pair], { ttl: 20_000 }),
        getExchangeRate(pair),
      ]);
      return NextResponse.json({ data: quotes, rate });
    }

    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ data: cache.data });
    }

    const data = await board();
    if (data.length === 0) throw new Error("no forex quotes");

    cache = { data, ts: Date.now() };
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Forex API error:", error);
    if (cache) return NextResponse.json({ data: cache.data });
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
