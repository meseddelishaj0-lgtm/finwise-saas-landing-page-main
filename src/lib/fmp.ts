// src/lib/fmp.ts
//
// Financial Modeling Prep client for the data Twelve Data's Pro plan does not
// cover, or only sells at 50–100 credits a call: valuation fields (market
// cap, P/E, EPS, moving averages), analyst data and fundamentals. Prices,
// charts, movers and sectors stay on Twelve Data (@/lib/twelvedata). See
// TWELVEDATA_MIGRATION.md for the split.
//
// Server-only: the key comes from FMP_API_KEY and never leaves the server.

export const FMP_BASE = "https://financialmodelingprep.com/api";

/* ------------------------------------------------------------------ *
 * Core fetch
 * ------------------------------------------------------------------ */

// FMP occasionally emits invalid JSON — raw backslashes inside strings
// (e.g. "Foundation Wealth Management, LLC\PA"). Escape any backslash that
// does not start a legal JSON escape so JSON.parse survives.
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
  }
}

const cache = new Map<string, { at: number; data: unknown }>();

/**
 * GET an FMP endpoint, e.g. fmp("v3/quote/AAPL,MSFT"). Resolves to null on
 * any failure (HTTP error, FMP "Error Message" payload, bad JSON), serving the
 * last good payload for the same request when there is one.
 */
export async function fmp<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  ttl = 60_000
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const key = `${path}?${qs.toString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data as T;

  qs.set("apikey", process.env.FMP_API_KEY || "");
  try {
    const res = await fetch(`${FMP_BASE}/${path.replace(/^\/+/, "")}?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    const data = safeParse(await res.text());
    if (data && typeof data === "object" && !Array.isArray(data) && "Error Message" in data) {
      throw new Error("FMP error");
    }
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
      for (const [k] of oldest) cache.delete(k);
    }
    cache.set(key, { at: Date.now(), data });
    return data as T;
  } catch {
    return hit ? (hit.data as T) : null;
  }
}

/* ------------------------------------------------------------------ *
 * Valuation fields for quote lists
 * ------------------------------------------------------------------ */

/** Slow-moving quote fields that Twelve Data only sells via 50-credit /statistics. */
export interface QuoteStats {
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  sharesOutstanding: number | null;
  avgVolume: number | null;
  earningsAnnouncement: string | null;
}

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Site symbols are FMP-native already ("^GSPC", "BTCUSD"); only a pair slash needs dropping. */
const toFmpSymbol = (s: string) => s.toUpperCase().trim().replace("/", "");

/**
 * Valuation fields for many symbols, keyed by the symbol as requested. One FMP
 * batch quote per 100 symbols; symbols FMP does not know are simply absent.
 */
export async function getQuoteStats(
  symbols: string[],
  ttl = 5 * 60_000
): Promise<Record<string, QuoteStats>> {
  const wanted = [...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < wanted.length; i += 100) chunks.push(wanted.slice(i, i + 100));

  const out: Record<string, QuoteStats> = {};
  await Promise.all(
    chunks.map(async (chunk) => {
      // "BTCUSD" and "BTC/USD" are one FMP symbol; answer every form asked for.
      const requestedBy = new Map<string, string[]>();
      for (const s of chunk) {
        const f = toFmpSymbol(s);
        requestedBy.set(f, [...(requestedBy.get(f) ?? []), s]);
      }
      const path = `v3/quote/${[...requestedBy.keys()].map(encodeURIComponent).join(",")}`;
      const rows = await fmp<Record<string, unknown>[]>(path, {}, ttl);
      for (const r of Array.isArray(rows) ? rows : []) {
        const cap = numOrNull(r.marketCap);
        const stats: QuoteStats = {
          marketCap: cap && cap > 0 ? cap : null, // FMP reports 0 for indices and FX
          pe: numOrNull(r.pe),
          eps: numOrNull(r.eps),
          priceAvg50: numOrNull(r.priceAvg50),
          priceAvg200: numOrNull(r.priceAvg200),
          sharesOutstanding: numOrNull(r.sharesOutstanding),
          avgVolume: numOrNull(r.avgVolume),
          earningsAnnouncement:
            typeof r.earningsAnnouncement === "string" ? r.earningsAnnouncement : null,
        };
        for (const requested of requestedBy.get(String(r.symbol || "").toUpperCase()) ?? []) {
          out[requested] = stats;
        }
      }
    })
  );
  return out;
}
