import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/fmp";
import { WORLD_INDICES, FX_CURRENCIES, FUTURES } from "@/components/market/functions/universe";

export const dynamic = "force-dynamic";

// Market-wide boards for the terminal: world equity indices (WEI), the FX
// cross matrix inputs (FXC) and the futures board (CMDTY). One FMP batch
// quote per view — Twelve Data carries neither world indices nor futures.
// `earnings` (EVTS) is FMP's earnings calendar: Twelve Data's misses names.

const VIEWS: Record<string, string[]> = {
  wei: WORLD_INDICES.map((i) => i.symbol),
  fx: FX_CURRENCIES.filter((c) => c.pair).map((c) => c.pair as string),
  futures: FUTURES.map((f) => f.symbol),
};

const TTL = 30_000;

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") || "wei";
  if (view === "earnings") return earnings();
  const symbols = VIEWS[view];
  if (!symbols) return NextResponse.json({ error: "Unknown view" }, { status: 400 });

  const rows = await fmp<Record<string, unknown>[]>(
    `v3/quote/${symbols.map(encodeURIComponent).join(",")}`,
    {},
    TTL
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No data" }, { status: 502 });
  }

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const data = rows.map((r) => ({
    symbol: String(r.symbol),
    name: String(r.name ?? r.symbol),
    price: num(r.price),
    change: num(r.change),
    changePercent: num(r.changesPercentage),
    dayLow: num(r.dayLow),
    dayHigh: num(r.dayHigh),
    yearLow: num(r.yearLow),
    yearHigh: num(r.yearHigh),
    open: num(r.open),
    previousClose: num(r.previousClose),
    volume: num(r.volume),
    timestamp: typeof r.timestamp === "number" ? r.timestamp * 1000 : null,
  }));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=15" },
  });
}

/**
 * Next two weeks of US earnings with a meaningful revenue estimate. Five-letter
 * tickers ending in F are foreign OTC ordinaries and are dropped.
 */
async function earnings() {
  // "Today" is the US trading date, not UTC (which rolls over at 8pm ET).
  const from = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const to = new Date(from);
  to.setDate(to.getDate() + 14);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rows = await fmp<Record<string, any>[]>(
    "v3/earning_calendar",
    { from: iso(from), to: iso(to) },
    30 * 60_000
  );
  const data = (Array.isArray(rows) ? rows : [])
    .filter((r) => /^[A-Z]{1,5}$/.test(String(r.symbol)) && !/^[A-Z]{4}F$/.test(String(r.symbol)) && (r.revenueEstimated ?? 0) >= 1e8)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || (b.revenueEstimated ?? 0) - (a.revenueEstimated ?? 0))
    .slice(0, 300)
    .map((r) => ({
      date: String(r.date),
      symbol: String(r.symbol),
      time: r.time ?? null,
      epsEstimated: r.epsEstimated ?? null,
      eps: r.eps ?? null,
      revenueEstimated: r.revenueEstimated ?? null,
      revenue: r.revenue ?? null,
      fiscalDateEnding: r.fiscalDateEnding ?? null,
    }));
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
}
