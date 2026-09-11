import { NextResponse } from "next/server";
import { searchSymbols, type AssetClass } from "@/lib/twelvedata";

// Symbol search, backed by Twelve Data's symbol_search. US listings rank
// first; the curated list below covers indices, crypto, FX and commodities
// under the ticker conventions the rest of the site uses.

export const dynamic = "force-dynamic";

interface Result {
  symbol: string;
  name: string;
  exchange: string;
  type: AssetClass;
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
  { symbol: "GCUSD", name: "Gold", exchange: "COMMODITY", type: "commodity" },
  { symbol: "SIUSD", name: "Silver", exchange: "COMMODITY", type: "commodity" },
  { symbol: "CLUSD", name: "Crude Oil WTI", exchange: "COMMODITY", type: "commodity" },
  { symbol: "BZUSD", name: "Brent Crude Oil", exchange: "COMMODITY", type: "commodity" },
  { symbol: "NGUSD", name: "Natural Gas", exchange: "COMMODITY", type: "commodity" },
  { symbol: "HGUSD", name: "Copper", exchange: "COMMODITY", type: "commodity" },
];

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "CBOE", "ARCA", "BATS", "IEX", "OTC"]);

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

  let remote: Result[] = [];
  try {
    const rows = await searchSymbols(q, 30);
    remote = rows
      // Twelve Data returns every venue a name is listed on; keep US lines so
      // a search for "apple" does not surface the Colombian or LSE listing.
      .filter((r) => r.symbol && !r.symbol.includes(".") && US_EXCHANGES.has(r.exchange))
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        exchange: r.exchange,
        type: r.type,
      }));
  } catch {
    // fall through with the curated matches only
  }

  const seen = new Set<string>();
  const all = [...staticMatches, ...remote].filter((r) => {
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
