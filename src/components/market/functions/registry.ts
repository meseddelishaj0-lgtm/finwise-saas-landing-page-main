// Terminal function directory. Codes follow Bloomberg mnemonics where one
// exists so muscle memory carries over: "<TICKER> <FUNC>" or "<FUNC>".

export type FnScope = "security" | "market";

export interface FnDef {
  code: string;
  name: string;
  desc: string;
  scope: FnScope;
  /** Needs company fundamentals (hidden for indices, crypto, FX, futures). */
  equityOnly?: boolean;
  aliases?: string[];
  /** Opens another page instead of a panel. */
  href?: string;
}

export const FUNCTIONS: FnDef[] = [
  { code: "GP", name: "Price Graph", desc: "Chart with studies: SMA/EMA, Bollinger, VWAP, RSI, MACD, Stochastic", scope: "security", aliases: ["GIP", "CHART", "G"] },
  { code: "DES", name: "Description", desc: "Company profile, executives, segments, ESG", scope: "security", equityOnly: true, aliases: ["PROFILE"] },
  { code: "FA", name: "Financial Analysis", desc: "Income, balance sheet, cash flow, ratios, growth", scope: "security", equityOnly: true, aliases: ["FIN"] },
  { code: "ANR", name: "Analyst Recommendations", desc: "Ratings, price targets, estimates, upgrades/downgrades", scope: "security", equityOnly: true, aliases: ["EEO", "BRC"] },
  { code: "HDS", name: "Holders", desc: "Institutional holders, insider transactions, float", scope: "security", equityOnly: true, aliases: ["OWN", "INS"] },
  { code: "ERN", name: "Earnings & Dividends", desc: "EPS history, surprises, dividend and split history", scope: "security", equityOnly: true, aliases: ["DVD", "EE", "EM"] },
  { code: "TRAN", name: "Call Transcripts", desc: "Earnings call transcripts by quarter", scope: "security", equityOnly: true, aliases: ["TRANS"] },
  { code: "RV", name: "Relative Value", desc: "Security vs its peer group: valuation, size, momentum", scope: "security", equityOnly: true, aliases: ["PEERS", "COMPS"] },
  { code: "HP", name: "Historical Prices", desc: "Daily/weekly/monthly OHLCV table with stats and CSV export", scope: "security", aliases: ["HIST"] },
  { code: "COMP", name: "Comparative Returns", desc: "Rebased returns vs up to 5 tickers, beta, correlation matrix", scope: "security", aliases: ["CORR", "HRA"] },
  { code: "TECH", name: "Technical Analysis", desc: "MA & oscillator signal gauge, pivots, volatility", scope: "security", aliases: ["TA"] },
  { code: "CN", name: "Company News", desc: "Headlines for the loaded security", scope: "security", aliases: ["N", "NEWS"] },

  { code: "WEI", name: "World Equity Indices", desc: "Americas, EMEA and Asia/Pacific index levels", scope: "market", aliases: ["INDICES", "WI"] },
  { code: "MOST", name: "Market Movers", desc: "Top gainers, losers and most active", scope: "market", aliases: ["MOV", "MOVERS"] },
  { code: "IMAP", name: "Sector Performance", desc: "S&P 500 sector moves and breadth", scope: "market", aliases: ["BI", "SECT", "SECTORS"] },
  { code: "FXC", name: "FX Cross Rates", desc: "Major currency cross matrix with daily moves", scope: "market", aliases: ["FX", "FXIP", "WCR"] },
  { code: "CMDTY", name: "Futures & Commodities", desc: "Equity-index, rates, energy, metals, ags, softs", scope: "market", aliases: ["GLCO", "CMBQ", "FUT"] },
  { code: "GC", name: "Yield Curve", desc: "US Treasury curve vs 1W/1M/3M ago, key spreads", scope: "market", aliases: ["YCRV", "CURVE", "BTMM"] },
  { code: "ECO", name: "Economic Calendar", desc: "Macro releases with survey, actual and prior", scope: "market", aliases: ["ECON"] },
  { code: "EVTS", name: "Earnings Calendar", desc: "Upcoming US earnings with estimates", scope: "market", aliases: ["EA", "ERNC"] },
  { code: "IPO", name: "IPO Calendar", desc: "Upcoming and recently priced offerings", scope: "market" },
  { code: "TOP", name: "Top News", desc: "Market-wide headlines", scope: "market", aliases: ["NI", "FIRST"] },
  { code: "HMAP", name: "Heatmap", desc: "S&P 1500 treemap heatmap", scope: "market", href: "/heatmap", aliases: ["HEAT"] },
  { code: "EQS", name: "Equity Screener", desc: "Screen 1,500 US stocks on fundamentals and performance", scope: "market", href: "/screener", aliases: ["SCREEN"] },
];

const BY_CODE = new Map<string, FnDef>();
for (const f of FUNCTIONS) {
  BY_CODE.set(f.code, f);
  for (const a of f.aliases ?? []) BY_CODE.set(a, f);
}

export const findFn = (token: string): FnDef | undefined => BY_CODE.get(token.toUpperCase());

/** Bloomberg yellow-key words users may type; ignored by the parser. */
const NOISE = new Set(["US", "EQUITY", "EQ", "INDEX", "CURNCY", "CRNCY", "COMDTY", "GO", "<GO>"]);

export type Command =
  | { kind: "help" }
  | { kind: "run"; symbol?: string; fn?: FnDef }
  | { kind: "empty" };

/** Parse "NVDA", "NVDA HP", "AAPL US EQUITY DES", "WEI", "HELP". */
export function parseCommand(raw: string): Command {
  const tokens = raw.trim().toUpperCase().split(/\s+/).filter((t) => t && !NOISE.has(t));
  if (!tokens.length) return { kind: "empty" };
  if (tokens.length === 1 && ["HELP", "?", "MENU", "FUNC"].includes(tokens[0])) return { kind: "help" };

  const lastFn = findFn(tokens[tokens.length - 1]);
  if (lastFn) {
    const sym = tokens.slice(0, -1).join("");
    return { kind: "run", fn: lastFn, symbol: sym || undefined };
  }
  // "FUNC TICKER" order is accepted too.
  const firstFn = tokens.length > 1 ? findFn(tokens[0]) : undefined;
  if (firstFn) return { kind: "run", fn: firstFn, symbol: tokens.slice(1).join("") };
  return { kind: "run", symbol: tokens.join("") };
}
