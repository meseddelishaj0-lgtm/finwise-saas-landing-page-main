import { NextResponse } from "next/server";

// Symbol search proxy (FMP) — ranks US listings first, includes major
// indices/crypto that FMP search omits. Key stays server-side.

export const dynamic = "force-dynamic";

interface Result {
  symbol: string;
  name: string;
  exchange: string;
  type: "stock" | "etf" | "index" | "crypto" | "forex" | "commodity";
}

const STATIC: Result[] = [
  { symbol: "^GSPC", name: "S&P 500", exchange: "INDEX", type: "index" },
  { symbol: "^IXIC", name: "NASDAQ Composite", exchange: "INDEX", type: "index" },
  { symbol: "^DJI", name: "Dow Jones Industrial Average", exchange: "INDEX", type: "index" },
  { symbol: "^RUT", name: "Russell 2000", exchange: "INDEX", type: "index" },
  { symbol: "^VIX", name: "CBOE Volatility Index", exchange: "INDEX", type: "index" },
  { symbol: "^TNX", name: "US 10 Year Treasury Yield", exchange: "INDEX", type: "index" },
  { symbol: "^TYX", name: "US 30 Year Treasury Yield", exchange: "INDEX", type: "index" },
  { symbol: "BTCUSD", name: "Bitcoin", exchange: "CRYPTO", type: "crypto" },
  { symbol: "ETHUSD", name: "Ethereum", exchange: "CRYPTO", type: "crypto" },
  { symbol: "SOLUSD", name: "Solana", exchange: "CRYPTO", type: "crypto" },
  { symbol: "XRPUSD", name: "XRP", exchange: "CRYPTO", type: "crypto" },
  { symbol: "DOGEUSD", name: "Dogecoin", exchange: "CRYPTO", type: "crypto" },
  { symbol: "ADAUSD", name: "Cardano", exchange: "CRYPTO", type: "crypto" },
  { symbol: "EURUSD", name: "Euro / US Dollar", exchange: "FOREX", type: "forex" },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", exchange: "FOREX", type: "forex" },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", exchange: "FOREX", type: "forex" },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", exchange: "FOREX", type: "forex" },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", exchange: "FOREX", type: "forex" },
  { symbol: "GCUSD", name: "Gold Futures", exchange: "COMMODITY", type: "commodity" },
  { symbol: "SIUSD", name: "Silver Futures", exchange: "COMMODITY", type: "commodity" },
  { symbol: "CLUSD", name: "Crude Oil WTI", exchange: "COMMODITY", type: "commodity" },
  { symbol: "BZUSD", name: "Brent Crude Oil", exchange: "COMMODITY", type: "commodity" },
  { symbol: "NGUSD", name: "Natural Gas", exchange: "COMMODITY", type: "commodity" },
  { symbol: "HGUSD", name: "Copper", exchange: "COMMODITY", type: "commodity" },
];

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "CBOE", "ETF", "CRYPTO"]);

const cache = new Map<string, { at: number; data: Result[] }>();
const TTL = 300_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 40);
  if (q.length < 1) return NextResponse.json([]);

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  const ql = q.toLowerCase();
  const staticMatches = STATIC.filter(
    (s) =>
      s.symbol.toLowerCase().includes(ql) ||
      s.symbol.replace("^", "").toLowerCase().startsWith(ql) ||
      s.name.toLowerCase().includes(ql)
  );

  let fmpMatches: Result[] = [];
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (apiKey) {
      const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=30&apikey=${apiKey}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          fmpMatches = rows
            .filter(
              (r: Record<string, string>) =>
                r.symbol &&
                !r.symbol.includes(".") &&
                US_EXCHANGES.has(r.exchangeShortName || "")
            )
            .map((r: Record<string, string>) => ({
              symbol: r.symbol,
              name: r.name || r.symbol,
              exchange: r.exchangeShortName || "US",
              type:
                r.exchangeShortName === "CRYPTO"
                  ? ("crypto" as const)
                  : r.exchangeShortName === "ETF"
                  ? ("etf" as const)
                  : ("stock" as const),
            }));
        }
      }
    }
  } catch {
    // fall through with static matches only
  }

  // De-dup, rank exact ticker match first, then prefix matches
  const seen = new Set<string>();
  const all = [...staticMatches, ...fmpMatches].filter((r) => {
    if (seen.has(r.symbol)) return false;
    seen.add(r.symbol);
    return true;
  });
  const qu = q.toUpperCase();
  all.sort((a, b) => {
    const score = (r: Result) =>
      r.symbol === qu || r.symbol === `^${qu}`
        ? 0
        : r.symbol.startsWith(qu)
        ? 1
        : r.name.toUpperCase().startsWith(qu)
        ? 2
        : 3;
    return score(a) - score(b);
  });

  const data = all.slice(0, 8);
  cache.set(key, { at: Date.now(), data });
  return NextResponse.json(data);
}
