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
    case "etf": return etf(req.nextUrl.searchParams.get("symbol"), req.nextUrl.searchParams.get("vs"));
    case "dividends": return dividends();
    case "splits": return splits();
    case "mna": return mna();
    case "events": return events();
    case "fxnews": return fxnews();
    case "holdings": return holdingsMeta(req.nextUrl.searchParams.get("symbols"));
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

/* -------------------------------- etf -------------------------------- */

const SYM = /^[A-Z0-9.-]{1,10}$/;
const pct = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

async function etfHoldings(symbol: string) {
  const rows = await fmp<Record<string, any>[]>(`v3/etf-holder/${symbol}`, {}, 6 * 3_600_000);
  return (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      asset: String(r.asset ?? ""),
      name: String(r.name ?? ""),
      weight: num(r.weightPercentage) ?? 0,
      value: num(r.marketValue),
    }))
    .filter((r) => r.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/** ETF: profile, top holdings, sector and country mix, and overlap against `vs`. */
async function etf(rawSymbol: string | null, rawVs: string | null) {
  const symbol = (rawSymbol || "").toUpperCase();
  const vs = (rawVs || "").toUpperCase();
  if (!SYM.test(symbol)) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const [info, holdings, sectors, countries, vsHoldings] = await Promise.all([
    fmp<Record<string, any>[]>("v4/etf-info", { symbol }, 6 * 3_600_000),
    etfHoldings(symbol),
    fmp<Record<string, any>[]>(`v3/etf-sector-weightings/${symbol}`, {}, 6 * 3_600_000),
    fmp<Record<string, any>[]>(`v3/etf-country-weightings/${symbol}`, {}, 6 * 3_600_000),
    SYM.test(vs) && vs !== symbol ? etfHoldings(vs) : Promise.resolve(null),
  ]);
  if (!holdings.length) return NextResponse.json({ error: "Not an ETF or no holdings" }, { status: 404 });

  const i = Array.isArray(info) ? info[0] : null;
  const mix = (rows: Record<string, any>[] | null, key: string) =>
    (Array.isArray(rows) ? rows : [])
      .map((r) => ({ name: String(r[key] ?? ""), weight: pct(r.weightPercentage) ?? 0 }))
      .filter((r) => r.name && r.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 14);

  let overlap = null;
  if (vsHoldings) {
    if (!vsHoldings.length) overlap = { vs, error: "No holdings found" };
    else {
      const other = new Map(vsHoldings.filter((h) => h.asset).map((h) => [h.asset, h.weight]));
      const common = holdings
        .filter((h) => h.asset && other.has(h.asset))
        .map((h) => ({ asset: h.asset, name: h.name, a: h.weight, b: other.get(h.asset)! }));
      overlap = {
        vs,
        // Overlap by weight: the share of each fund that sits in the same names.
        weight: Math.round(common.reduce((s, c) => s + Math.min(c.a, c.b), 0) * 100) / 100,
        count: common.length,
        ofA: holdings.length,
        ofB: vsHoldings.length,
        top: common.sort((x, y) => Math.min(y.a, y.b) - Math.min(x.a, x.b)).slice(0, 15),
      };
    }
  }

  return json(
    {
      symbol,
      name: i?.name ?? null,
      description: i?.description ?? null,
      aum: num(i?.aum),
      expenseRatio: num(i?.expenseRatio),
      inception: i?.inceptionDate ?? null,
      issuer: i?.etfCompany ?? null,
      assetClass: i?.assetClass ?? null,
      holdingsCount: num(i?.holdingsCount) ?? holdings.length,
      top10: Math.round(holdings.slice(0, 10).reduce((s, h) => s + h.weight, 0) * 100) / 100,
      holdings: holdings.slice(0, 50),
      sectors: mix(sectors, "sector"),
      countries: mix(countries, "country"),
      overlap,
    },
    1800
  );
}

/* ------------------------ dividends / splits ------------------------ */

const etDate = (offsetDays = 0) => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// Five-letter tickers ending in F are foreign OTC ordinaries, not US listings.
const US_TICKER = /^(?![A-Z]{4}F$)[A-Z]{1,5}$/;

/** Ex-dividend dates for the next two weeks, companies of $2B+ only. */
async function dividends() {
  const rows = await fmp<Record<string, any>[]>("v3/stock_dividend_calendar", { from: etDate(), to: etDate(14) }, 3_600_000);
  const us = (Array.isArray(rows) ? rows : []).filter((r) => US_TICKER.test(String(r.symbol)) && (r.dividend ?? 0) > 0);
  if (!us.length) return unavailable();

  const symbols = [...new Set(us.map((r) => String(r.symbol)))];
  const quotes = new Map<string, Record<string, any>>();
  await Promise.all(
    Array.from({ length: Math.ceil(symbols.length / 150) }, (_, i) => symbols.slice(i * 150, i * 150 + 150)).map(async (chunk) => {
      const q = await fmp<Record<string, any>[]>(`v3/quote/${chunk.join(",")}`, {}, 3_600_000);
      for (const r of Array.isArray(q) ? q : []) quotes.set(String(r.symbol), r);
    })
  );
  const data = us
    .map((r) => {
      const q = quotes.get(String(r.symbol));
      return {
        date: String(r.date),
        symbol: String(r.symbol),
        name: q?.name ? String(q.name) : "",
        dividend: num(r.dividend),
        price: num(q?.price),
        marketCap: num(q?.marketCap),
        payDate: r.paymentDate ? String(r.paymentDate) : null,
        recordDate: r.recordDate ? String(r.recordDate) : null,
      };
    })
    .filter((r) => (r.marketCap ?? 0) >= 2e9)
    .sort((a, b) => a.date.localeCompare(b.date) || (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 300);
  return json(data, 900);
}

async function splits() {
  const rows = await fmp<Record<string, any>[]>("v3/stock_split_calendar", { from: etDate(-14), to: etDate(45) }, 3_600_000);
  const data = (Array.isArray(rows) ? rows : [])
    .filter((r) => US_TICKER.test(String(r.symbol)) && r.numerator > 0 && r.denominator > 0)
    .map((r) => ({
      date: String(r.date),
      symbol: String(r.symbol),
      numerator: Number(r.numerator),
      denominator: Number(r.denominator),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return unavailable();
  return json(data, 900);
}

/* -------------------------------- mna -------------------------------- */

/** Latest M&A filings, one row per deal (FMP lists each share class separately). */
async function mna() {
  let rows: Record<string, any>[] = [];
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/mergers-acquisitions-latest?page=0&limit=200&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 900 } }
    );
    if (res.ok) rows = await res.json();
  } catch {}
  if (!Array.isArray(rows) || !rows.length) return unavailable();
  const seen = new Set<string>();
  const data = [];
  for (const r of rows) {
    const key = `${r.cik}|${r.targetedCik || r.targetedCompanyName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    data.push({
      date: String(r.transactionDate ?? "").slice(0, 10),
      acquirer: String(r.companyName ?? ""),
      acquirerSymbol: String(r.symbol ?? "").replace(/-(UN|WT|U|W|R)$/, ""),
      target: String(r.targetedCompanyName ?? ""),
      targetSymbol: r.targetedSymbol ? String(r.targetedSymbol) : "",
      link: typeof r.link === "string" ? r.link : null,
    });
  }
  return json(data.slice(0, 120), 900);
}

/* ------------------------------ events ------------------------------ */

/** Medium and high impact economic releases, yesterday through three days out. */
async function events() {
  const rows = await fmp<Record<string, any>[]>("v3/economic_calendar", { from: etDate(-1), to: etDate(3) }, 15 * 60_000);
  const data = (Array.isArray(rows) ? rows : [])
    .filter((r) => r.impact === "High" || r.impact === "Medium")
    .map((r) => ({
      date: String(r.date),
      country: String(r.country ?? ""),
      event: String(r.event ?? ""),
      impact: String(r.impact),
      actual: num(r.actual),
      estimate: num(r.estimate),
      previous: num(r.previous),
      unit: r.unit ? String(r.unit) : "",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return unavailable();
  return json(data, 300);
}

/* ------------------------------ fxnews ------------------------------ */

async function fxnews() {
  const pages = await Promise.all([0, 1, 2].map((page) => fmp<Record<string, any>[]>("v4/forex_news", { page }, 10 * 60_000)));
  const data = pages
    .flatMap((p) => (Array.isArray(p) ? p : []))
    .map((r) => ({
      symbol: String(r.symbol ?? ""),
      title: String(r.title ?? ""),
      site: String(r.site ?? ""),
      url: String(r.url ?? ""),
      date: String(r.publishedDate ?? ""),
    }))
    .filter((r) => r.title && /^https?:\/\//.test(r.url));
  if (!data.length) return unavailable();
  return json(data, 300);
}

/* ----------------------------- holdings ----------------------------- */

/** Sector, beta, dividend and next earnings date for a list of holdings (PORT). */
async function holdingsMeta(raw: string | null) {
  const symbols = [...new Set((raw || "").toUpperCase().split(",").map((s) => s.trim()).filter((s) => SYM.test(s)))].slice(0, 40);
  if (!symbols.length) return NextResponse.json({ error: "symbols required" }, { status: 400 });
  const [profiles, quotes] = await Promise.all([
    fmp<Record<string, any>[]>(`v3/profile/${symbols.join(",")}`, {}, 3_600_000),
    fmp<Record<string, any>[]>(`v3/quote/${symbols.join(",")}`, {}, 3_600_000),
  ]);
  const q = new Map((Array.isArray(quotes) ? quotes : []).map((r) => [String(r.symbol), r]));
  const data = (Array.isArray(profiles) ? profiles : []).map((p) => ({
    symbol: String(p.symbol),
    name: String(p.companyName ?? p.symbol),
    sector: p.isEtf ? "ETF" : p.sector ? String(p.sector) : "Other",
    beta: num(p.beta),
    annualDividend: num(p.lastDiv),
    earnings: typeof q.get(String(p.symbol))?.earningsAnnouncement === "string" ? String(q.get(String(p.symbol))!.earningsAnnouncement).slice(0, 10) : null,
  }));
  return json(data, 900);
}
