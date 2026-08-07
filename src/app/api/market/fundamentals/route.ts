import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Consolidated FMP fundamentals proxy for the /terminal fundamentals suite.
// One route, many datasets — keeps the key server-side, slims heavy payloads
// (institutional-holder is ~1MB raw) and caches per (symbol, dataset, period).

const FMP = "https://financialmodelingprep.com/api";
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

type Slim = (raw: any) => any;

interface FetchOpts {
  period: "annual" | "quarter";
  quarter?: number;
  year?: number;
}

interface DatasetSpec {
  url: (symbol: string, opts: FetchOpts) => string;
  ttl: number;
  slim?: Slim;
  /** Requires valid quarter+year query params (earnings transcripts). */
  needsQuarterYear?: boolean;
}

const first: Slim = (r) => (Array.isArray(r) && r.length ? r[0] : null);
const arr = (r: any): any[] => (Array.isArray(r) ? r : []);

const DATASETS: Record<string, DatasetSpec> = {
  profile: {
    url: (s) => `${FMP}/v3/profile/${s}`,
    ttl: 6 * HOUR,
    slim: first,
  },
  income: {
    url: (s, { period: p }) => `${FMP}/v3/income-statement/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  balance: {
    url: (s, { period: p }) => `${FMP}/v3/balance-sheet-statement/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  cashflow: {
    url: (s, { period: p }) => `${FMP}/v3/cash-flow-statement/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  "key-metrics": {
    url: (s, { period: p }) => `${FMP}/v3/key-metrics/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  "key-metrics-ttm": {
    url: (s) => `${FMP}/v3/key-metrics-ttm/${s}`,
    ttl: 1 * HOUR,
    slim: first,
  },
  ratios: {
    url: (s, { period: p }) => `${FMP}/v3/ratios/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  "ratios-ttm": {
    url: (s) => `${FMP}/v3/ratios-ttm/${s}`,
    ttl: 1 * HOUR,
    slim: first,
  },
  growth: {
    url: (s, { period: p }) => `${FMP}/v3/financial-growth/${s}?period=${p}&limit=${p === "quarter" ? 12 : 8}`,
    ttl: 6 * HOUR,
  },
  estimates: {
    url: (s) => `${FMP}/v3/analyst-estimates/${s}?limit=8`,
    ttl: 6 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 8).map((e) => ({
        date: e.date,
        estimatedRevenueAvg: e.estimatedRevenueAvg,
        estimatedRevenueLow: e.estimatedRevenueLow,
        estimatedRevenueHigh: e.estimatedRevenueHigh,
        estimatedEbitdaAvg: e.estimatedEbitdaAvg,
        estimatedNetIncomeAvg: e.estimatedNetIncomeAvg,
        estimatedEpsAvg: e.estimatedEpsAvg,
        estimatedEpsLow: e.estimatedEpsLow,
        estimatedEpsHigh: e.estimatedEpsHigh,
        numberAnalystEstimatedRevenue: e.numberAnalystEstimatedRevenue,
        numberAnalystsEstimatedEps: e.numberAnalystsEstimatedEps,
      })),
  },
  "price-target-consensus": {
    url: (s) => `${FMP}/v4/price-target-consensus?symbol=${s}`,
    ttl: 30 * MIN,
    slim: first,
  },
  "price-targets": {
    url: (s) => `${FMP}/v4/price-target?symbol=${s}`,
    ttl: 30 * MIN,
    slim: (r) =>
      arr(r).slice(0, 12).map((t) => ({
        publishedDate: t.publishedDate,
        analystName: t.analystName,
        analystCompany: t.analystCompany,
        priceTarget: t.priceTarget,
        adjPriceTarget: t.adjPriceTarget,
        priceWhenPosted: t.priceWhenPosted,
        newsURL: t.newsURL,
        newsTitle: t.newsTitle,
        newsPublisher: t.newsPublisher,
      })),
  },
  grades: {
    url: (s) => `${FMP}/v4/upgrades-downgrades?symbol=${s}`,
    ttl: 30 * MIN,
    slim: (r) =>
      arr(r).slice(0, 16).map((g) => ({
        publishedDate: g.publishedDate,
        gradingCompany: g.gradingCompany,
        action: g.action,
        previousGrade: g.previousGrade,
        newGrade: g.newGrade,
        priceWhenPosted: g.priceWhenPosted,
      })),
  },
  rating: {
    url: (s) => `${FMP}/v3/rating/${s}`,
    ttl: 30 * MIN,
    slim: first,
  },
  earnings: {
    url: (s) => `${FMP}/v3/historical/earning_calendar/${s}?limit=12`,
    ttl: 30 * MIN,
    slim: (r) =>
      arr(r).slice(0, 12).map((e) => ({
        date: e.date,
        eps: e.eps,
        epsEstimated: e.epsEstimated,
        time: e.time,
        revenue: e.revenue,
        revenueEstimated: e.revenueEstimated,
        fiscalDateEnding: e.fiscalDateEnding,
      })),
  },
  surprises: {
    url: (s) => `${FMP}/v3/earnings-surprises/${s}`,
    ttl: 30 * MIN,
    slim: (r) =>
      arr(r).slice(0, 12).map((e) => ({
        date: e.date,
        actualEarningResult: e.actualEarningResult,
        estimatedEarning: e.estimatedEarning,
      })),
  },
  dividends: {
    url: (s) => `${FMP}/v3/historical-price-full/stock_dividend/${s}`,
    ttl: 6 * HOUR,
    slim: (r) =>
      arr(r?.historical).slice(0, 16).map((d) => ({
        date: d.date,
        adjDividend: d.adjDividend,
        dividend: d.dividend,
        recordDate: d.recordDate,
        paymentDate: d.paymentDate,
        declarationDate: d.declarationDate,
      })),
  },
  splits: {
    url: (s) => `${FMP}/v3/historical-price-full/stock_split/${s}`,
    ttl: 6 * HOUR,
    slim: (r) =>
      arr(r?.historical).slice(0, 10).map((d) => ({
        date: d.date,
        numerator: d.numerator,
        denominator: d.denominator,
      })),
  },
  insider: {
    url: (s) => `${FMP}/v4/insider-trading?symbol=${s}&page=0`,
    ttl: 30 * MIN,
    slim: (r) =>
      arr(r).slice(0, 30).map((t) => ({
        filingDate: t.filingDate,
        transactionDate: t.transactionDate,
        reportingName: t.reportingName,
        typeOfOwner: t.typeOfOwner,
        transactionType: t.transactionType,
        acquistionOrDisposition: t.acquistionOrDisposition,
        securitiesTransacted: t.securitiesTransacted,
        price: t.price,
        securityName: t.securityName,
        link: t.link,
      })),
  },
  institutional: {
    url: (s) => `${FMP}/v3/institutional-holder/${s}`,
    ttl: 6 * HOUR,
    slim: (r) =>
      arr(r)
        .filter((h) => typeof h?.shares === "number")
        .sort((a, b) => b.shares - a.shares)
        .slice(0, 25)
        .map((h) => ({
          holder: h.holder,
          shares: h.shares,
          change: h.change,
          dateReported: h.dateReported,
        })),
  },
  peers: {
    url: (s) => `${FMP}/v4/stock_peers?symbol=${s}`,
    ttl: 6 * HOUR,
    slim: (r) => arr(r?.[0]?.peersList).slice(0, 12),
  },
  dcf: {
    url: (s) => `${FMP}/v3/discounted-cash-flow/${s}`,
    ttl: 1 * HOUR,
    slim: (r) => {
      const d = first(r);
      return d ? { date: d.date, dcf: d.dcf, stockPrice: d["Stock Price"] } : null;
    },
  },
  "sec-filings": {
    url: (s) => `${FMP}/v3/sec_filings/${s}?limit=20`,
    ttl: 1 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 20).map((f) => ({
        fillingDate: f.fillingDate,
        type: f.type,
        link: f.link,
        finalLink: f.finalLink,
      })),
  },
  "shares-float": {
    url: (s) => `${FMP}/v4/shares_float?symbol=${s}`,
    ttl: 6 * HOUR,
    slim: first,
  },
  employees: {
    url: (s) => `${FMP}/v4/historical/employee_count?symbol=${s}`,
    ttl: 24 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 12).map((e) => ({
        periodOfReport: e.periodOfReport,
        employeeCount: e.employeeCount,
      })),
  },
  segmentation: {
    url: (s) => `${FMP}/v4/revenue-product-segmentation?symbol=${s}&structure=flat`,
    ttl: 24 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 8).map((row) => {
        const date = Object.keys(row)[0];
        return { date, segments: row[date] || {} };
      }),
  },
  esg: {
    url: (s) => `${FMP}/v4/esg-environmental-social-governance-data?symbol=${s}`,
    ttl: 24 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 4).map((e) => ({
        date: e.date,
        environmentalScore: e.environmentalScore,
        socialScore: e.socialScore,
        governanceScore: e.governanceScore,
        ESGScore: e.ESGScore,
      })),
  },
  executives: {
    url: (s) => `${FMP}/v3/key-executives/${s}`,
    ttl: 24 * HOUR,
    slim: (r) =>
      arr(r).slice(0, 12).map((e) => ({
        title: e.title,
        name: e.name,
        pay: e.pay,
        yearBorn: e.yearBorn,
        titleSince: e.titleSince,
      })),
  },
  // v4 list endpoint returns tuples: [[quarter, year, "date"], ...]
  "transcript-dates": {
    url: (s) => `${FMP}/v4/earning_call_transcript?symbol=${s}`,
    ttl: 6 * HOUR,
    slim: (r) =>
      arr(r)
        .filter((t) => Array.isArray(t) && t.length >= 3)
        .slice(0, 16)
        .map((t) => ({ quarter: t[0], year: t[1], date: t[2] })),
  },
  transcript: {
    url: (s, { quarter, year }) =>
      `${FMP}/v3/earning_call_transcript/${s}?quarter=${quarter}&year=${year}`,
    ttl: 24 * HOUR,
    needsQuarterYear: true,
    slim: (r) => {
      const t = first(r);
      return t
        ? { quarter: t.quarter, year: t.year, date: t.date, content: t.content }
        : null;
    },
  },
};

// FMP occasionally emits invalid JSON — raw backslashes inside strings
// (e.g. "Foundation Wealth Management, LLC\PA"). Escape any backslash not
// starting a legal JSON escape so JSON.parse survives.
function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
  }
}

const cache = new Map<string, { ts: number; ttl: number; data: any }>();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = (sp.get("symbol") || "").trim().toUpperCase();
  const dataset = (sp.get("dataset") || "").trim();
  const period = sp.get("period") === "quarter" ? "quarter" : "annual";
  const quarter = Number(sp.get("quarter"));
  const year = Number(sp.get("year"));

  if (!/^[A-Z0-9^./-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  const spec = DATASETS[dataset];
  if (!spec) {
    return NextResponse.json({ error: "unknown dataset" }, { status: 400 });
  }
  if (
    spec.needsQuarterYear &&
    (!Number.isInteger(quarter) || quarter < 1 || quarter > 4 ||
      !Number.isInteger(year) || year < 1990 || year > 2100)
  ) {
    return NextResponse.json({ error: "quarter/year required" }, { status: 400 });
  }

  const key = `${symbol}|${dataset}|${period}|${quarter || ""}|${year || ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < hit.ttl) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  try {
    const url = spec.url(encodeURIComponent(symbol), { period, quarter, year });
    const joined = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${joined}apikey=${process.env.FMP_API_KEY}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const raw = safeParse(await res.text());
    if (raw && typeof raw === "object" && !Array.isArray(raw) && raw["Error Message"]) {
      throw new Error("fmp error");
    }
    const data = spec.slim ? spec.slim(raw) : raw;

    if (cache.size > 400) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 100);
      for (const [k] of oldest) cache.delete(k);
    }
    cache.set(key, { ts: Date.now(), ttl: spec.ttl, data });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    if (hit) return NextResponse.json(hit.data);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
