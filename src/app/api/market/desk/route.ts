import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/fmp";

export const dynamic = "force-dynamic";

// Market-wide desks for the terminal, all from FMP:
//   ?view=crypto    CRYP  — top coins, one batch quote
//   ?view=econ      ECST  — US macro indicators with history
//   ?view=insiders  INSD  — latest Form 4 open-market buys and sells
//   ?view=congress  GOV   — latest Senate and House trade disclosures
//   ?view=cot       COT   — CFTC positioning, latest report per contract

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const json = (data: unknown, maxAge: number) =>
  NextResponse.json(data, { headers: { "Cache-Control": `public, max-age=${maxAge}` } });
const unavailable = () => NextResponse.json({ error: "No data" }, { status: 502 });

export async function GET(req: NextRequest) {
  switch (req.nextUrl.searchParams.get("view")) {
    case "crypto": return crypto();
    case "econ": return econ();
    case "insiders": return insiders();
    case "congress": return congress();
    case "cot": return cot();
    default: return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }
}

/* ------------------------------ crypto ------------------------------ */

const COINS = [
  "BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "TRX", "LINK", "AVAX", "XLM", "SUI",
  "HBAR", "BCH", "LTC", "DOT", "UNI", "NEAR", "APT", "AAVE", "ETC", "ATOM", "FIL", "ARB",
];

async function crypto() {
  const rows = await fmp<Record<string, unknown>[]>(`v3/quote/${COINS.map((c) => `${c}USD`).join(",")}`, {}, 30_000);
  if (!Array.isArray(rows) || !rows.length) return unavailable();
  const data = rows
    .map((r) => ({
      symbol: String(r.symbol),
      name: String(r.name ?? r.symbol).replace(/ USD$/i, ""),
      price: num(r.price),
      change: num(r.change),
      changePercent: num(r.changesPercentage),
      marketCap: num(r.marketCap),
      volume: num(r.volume),
      dayLow: num(r.dayLow),
      dayHigh: num(r.dayHigh),
      yearLow: num(r.yearLow),
      yearHigh: num(r.yearHigh),
      avg50: num(r.priceAvg50),
      avg200: num(r.priceAvg200),
    }))
    .filter((r) => r.price !== null)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  return json(data, 15);
}

/* ------------------------------- econ ------------------------------- */

type Mode = "level" | "yoy" | "diff";
interface Indicator {
  key: string;
  label: string;
  group: string;
  unit: string;
  mode: Mode;
  /** Observations per year, for the year-over-year lag. */
  perYear?: number;
  /** Divide raw values by this before reporting (e.g. persons → thousands). */
  scale?: number;
}

const INDICATORS: Indicator[] = [
  { key: "federalFunds", label: "Fed Funds Rate", group: "Rates", unit: "%", mode: "level" },
  { key: "30YearFixedRateMortgageAverage", label: "30Y Mortgage Rate", group: "Rates", unit: "%", mode: "level" },
  { key: "CPI", label: "CPI Inflation", group: "Prices", unit: "% YoY", mode: "yoy", perYear: 12 },
  { key: "realGDP", label: "Real GDP Growth", group: "Growth", unit: "% YoY", mode: "yoy", perYear: 4 },
  { key: "industrialProductionTotalIndex", label: "Industrial Production", group: "Growth", unit: "% YoY", mode: "yoy", perYear: 12 },
  { key: "retailSales", label: "Retail Sales", group: "Growth", unit: "% YoY", mode: "yoy", perYear: 12 },
  { key: "durableGoods", label: "Durable Goods Orders", group: "Growth", unit: "% YoY", mode: "yoy", perYear: 12 },
  { key: "unemploymentRate", label: "Unemployment Rate", group: "Labor", unit: "%", mode: "level" },
  { key: "totalNonfarmPayroll", label: "Nonfarm Payrolls", group: "Labor", unit: "K MoM", mode: "diff" },
  { key: "initialClaims", label: "Initial Jobless Claims", group: "Labor", unit: "K", mode: "level", scale: 1000 },
  { key: "consumerSentiment", label: "Consumer Sentiment", group: "Consumer", unit: "index", mode: "level" },
  { key: "newPrivatelyOwnedHousingUnitsStartedTotalUnits", label: "Housing Starts", group: "Consumer", unit: "K SAAR", mode: "level" },
  { key: "smoothedUSRecessionProbabilities", label: "Recession Probability", group: "Growth", unit: "%", mode: "level" },
];

async function econ() {
  const out = await Promise.all(
    INDICATORS.map(async (ind) => {
      const rows = await fmp<{ date: string; value: number }[]>("v4/economic", { name: ind.key }, 6 * 3_600_000);
      if (!Array.isArray(rows) || rows.length < 3) return null;
      // FMP sends newest first.
      const asc = rows
        .filter((r) => typeof r.value === "number" && Number.isFinite(r.value))
        .map((r) => ({ d: String(r.date).slice(0, 10), v: r.value / (ind.scale ?? 1) }))
        .sort((a, b) => a.d.localeCompare(b.d));

      let series = asc;
      if (ind.mode === "yoy") {
        const lag = ind.perYear ?? 12;
        series = asc.slice(lag).map((p, i) => ({ d: p.d, v: asc[i].v ? (p.v / asc[i].v - 1) * 100 : 0 }));
      } else if (ind.mode === "diff") {
        series = asc.slice(1).map((p, i) => ({ d: p.d, v: p.v - asc[i].v }));
      }
      if (series.length < 2) return null;
      const round = (v: number) => Math.round(v * 100) / 100;
      const tail = series.slice(-180).map((p) => ({ d: p.d, v: round(p.v) }));
      const latest = tail[tail.length - 1];
      const prev = tail[tail.length - 2];
      return {
        key: ind.key,
        label: ind.label,
        group: ind.group,
        unit: ind.unit,
        date: latest.d,
        value: latest.v,
        previous: prev.v,
        change: round(latest.v - prev.v),
        series: tail,
      };
    })
  );
  const data = out.filter(Boolean);
  if (!data.length) return unavailable();
  return json(data, 1800);
}

/* ----------------------------- insiders ----------------------------- */

async function insiders() {
  const [buys, sells] = await Promise.all(
    ["P-Purchase", "S-Sale"].map((transactionType) =>
      fmp<Record<string, any>[]>("v4/insider-trading", { transactionType, page: 0 }, 5 * 60_000)
    )
  );
  const rows = [...(Array.isArray(buys) ? buys : []), ...(Array.isArray(sells) ? sells : [])];
  if (!rows.length) return unavailable();
  const data = rows
    .filter((r) => /^[A-Z.]{1,6}$/.test(String(r.symbol)) && (r.price ?? 0) > 0 && (r.securitiesTransacted ?? 0) > 0)
    .map((r) => ({
      symbol: String(r.symbol),
      filed: String(r.filingDate ?? ""),
      date: String(r.transactionDate ?? ""),
      name: String(r.reportingName ?? ""),
      role: String(r.typeOfOwner ?? "").replace(/^officer:\s*/i, ""),
      side: String(r.transactionType).startsWith("P") ? "buy" : "sell",
      shares: num(r.securitiesTransacted),
      price: num(r.price),
      value: (r.securitiesTransacted ?? 0) * (r.price ?? 0),
      owned: num(r.securitiesOwned),
      link: typeof r.link === "string" ? r.link : null,
    }))
    .sort((a, b) => b.filed.localeCompare(a.filed));
  return json(data, 120);
}

/* ----------------------------- congress ----------------------------- */

async function congress() {
  const [senate, house] = await Promise.all([
    fmp<Record<string, any>[]>("v4/senate-trading-rss-feed", { page: 0 }, 30 * 60_000),
    fmp<Record<string, any>[]>("v4/senate-disclosure-rss-feed", { page: 0 }, 30 * 60_000),
  ]);
  const data = [
    ...(Array.isArray(senate) ? senate : []).map((r) => ({
      chamber: "Senate",
      member: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || String(r.office ?? ""),
      symbol: String(r.symbol ?? ""),
      asset: String(r.assetDescription ?? ""),
      type: String(r.type ?? ""),
      amount: String(r.amount ?? ""),
      owner: String(r.owner ?? ""),
      date: String(r.transactionDate ?? ""),
      disclosed: String(r.dateRecieved ?? ""),
      link: typeof r.link === "string" ? r.link : null,
    })),
    ...(Array.isArray(house) ? house : []).map((r) => ({
      chamber: "House",
      member: String(r.representative ?? ""),
      symbol: String(r.ticker ?? ""),
      asset: String(r.assetDescription ?? ""),
      type: String(r.type ?? ""),
      amount: String(r.amount ?? ""),
      owner: String(r.owner ?? ""),
      date: String(r.transactionDate ?? ""),
      disclosed: String(r.disclosureDate ?? ""),
      link: typeof r.link === "string" ? r.link : null,
    })),
  ]
    .filter((r) => r.member && /^\d{4}-\d{2}-\d{2}/.test(r.disclosed))
    .sort((a, b) => b.disclosed.localeCompare(a.disclosed) || b.date.localeCompare(a.date))
    .slice(0, 200);
  if (!data.length) return unavailable();
  return json(data, 900);
}

/* -------------------------------- cot -------------------------------- */

async function cot() {
  // Reports are weekly (Tuesday positions, published Friday); three weeks back
  // always covers the latest one.
  const to = new Date();
  const from = new Date(to.getTime() - 21 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const rows = await fmp<Record<string, any>[]>(
    "v4/commitment_of_traders_report_analysis",
    { from: iso(from), to: iso(to) },
    3_600_000
  );
  if (!Array.isArray(rows) || !rows.length) return unavailable();
  const latest = new Map<string, Record<string, any>>();
  for (const r of rows) {
    const cur = latest.get(r.symbol);
    if (!cur || String(r.date) > String(cur.date)) latest.set(r.symbol, r);
  }
  const data = [...latest.values()]
    .map((r) => ({
      symbol: String(r.symbol),
      name: String(r.name ?? r.symbol).replace(/\s*\([A-Z0-9]+\)\s*$/, ""),
      sector: String(r.sector ?? ""),
      date: String(r.date ?? "").slice(0, 10),
      longPct: num(r.currentLongMarketSituation),
      shortPct: num(r.currentShortMarketSituation),
      prevLongPct: num(r.previousLongMarketSituation),
      situation: String(r.marketSituation ?? ""),
      sentiment: String(r.marketSentiment ?? ""),
      net: num(r.netPostion), // FMP's spelling
      prevNet: num(r.previousNetPosition),
      reversal: !!r.reversalTrend,
    }))
    .sort((a, b) => a.sector.localeCompare(b.sector) || a.name.localeCompare(b.name));
  return json(data, 1800);
}
