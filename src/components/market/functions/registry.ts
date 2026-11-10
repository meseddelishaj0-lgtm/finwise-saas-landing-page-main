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

// Aliases must not be real tickers: a single token that matches a function
// runs the function instead of loading the security.
export const FUNCTIONS: FnDef[] = [
  { code: "GP", name: "Price Graph", desc: "Chart with studies: SMA/EMA, Bollinger, VWAP, RSI, MACD, Stochastic", scope: "security", aliases: ["GIP", "CHART", "G"] },
  { code: "DES", name: "Description", desc: "Company profile, executives, segments, ESG", scope: "security", equityOnly: true, aliases: ["PROFILE"] },
  { code: "FA", name: "Financial Analysis", desc: "Income, balance sheet, cash flow, ratios, growth", scope: "security", equityOnly: true, aliases: ["FIN"] },
  { code: "ANR", name: "Analyst Recommendations", desc: "Ratings, price targets, estimates, upgrades/downgrades", scope: "security", equityOnly: true, aliases: ["EEO", "BRC"] },
  { code: "HDS", name: "Holders", desc: "Institutional holders, insider transactions, float", scope: "security", equityOnly: true, aliases: ["OWN", "INS"] },
  { code: "ERN", name: "Earnings & Dividends", desc: "EPS history, surprises, dividend and split history", scope: "security", equityOnly: true, aliases: ["DVD", "EE", "EM"] },
  { code: "TRAN", name: "Call Transcripts", desc: "Earnings call transcripts by quarter, with AI questions", scope: "security", equityOnly: true, aliases: ["TRANS"] },
  { code: "FIL", name: "Filings", desc: "SEC filings and an AI brief on the latest quarter", scope: "security", equityOnly: true, aliases: ["FILINGS", "SEC", "10K", "10Q"] },
  { code: "RV", name: "Relative Value", desc: "Security vs its peer group: valuation, size, momentum", scope: "security", equityOnly: true, aliases: ["PEERS", "COMPS"] },
  { code: "ETF", name: "ETF Analysis", desc: "Holdings, sector and country exposure, overlap with another ETF", scope: "security", aliases: ["HOLDINGS", "ETFS"] },
  { code: "HP", name: "Historical Prices", desc: "Daily/weekly/monthly OHLCV table with stats and CSV export", scope: "security", aliases: ["HIST"] },
  { code: "COMP", name: "Comparative Returns", desc: "Rebased returns vs up to 5 tickers, beta, correlation matrix", scope: "security", aliases: ["CORR", "HRA"] },
  { code: "TECH", name: "Technical Analysis", desc: "MA & oscillator signal gauge, pivots, volatility", scope: "security", aliases: ["TA"] },
  { code: "SEAG", name: "Seasonality", desc: "Monthly return grid over ten years, average and hit rate by month", scope: "security", aliases: ["SEAS", "SEASON"] },
  { code: "CN", name: "Company News", desc: "Headlines for the loaded security", scope: "security", aliases: ["N", "NEWS"] },

  { code: "ASK", name: "Ask the Terminal", desc: "Plain-English questions answered from live terminal data", scope: "market", aliases: ["ASKB", "QUESTION"] },
  { code: "GLOBE", name: "World Markets Globe", desc: "3D globe: commodity sites and flows, chokepoints, indices, currencies, economic releases", scope: "market", aliases: ["BMAP", "MAP", "WORLD", "EARTH"] },
  { code: "WEI", name: "World Equity Indices", desc: "Americas, EMEA and Asia/Pacific index levels", scope: "market", aliases: ["INDICES", "WI"] },
  { code: "MOST", name: "Market Movers", desc: "Top gainers, losers and most active", scope: "market", aliases: ["MOV", "MOVERS"] },
  { code: "IMAP", name: "Sector Performance", desc: "S&P 500 sector moves and breadth", scope: "market", aliases: ["BI", "SECT", "SECTORS"] },
  { code: "FXC", name: "FX Cross Rates", desc: "Major currency cross matrix with daily moves", scope: "market", aliases: ["FX", "FXIP", "WCR"] },
  { code: "CMDTY", name: "Futures & Commodities", desc: "Equity-index, rates, energy, metals, ags, softs", scope: "market", aliases: ["GLCO", "CMBQ", "FUT"] },
  { code: "COT", name: "Commitments of Traders", desc: "CFTC speculator positioning by futures contract", scope: "market", aliases: ["CFTC", "POS"] },
  { code: "CRYP", name: "Crypto Markets", desc: "Top coins: price, market cap, volume, trend", scope: "market", aliases: ["CRYPTO", "XBT"] },
  { code: "GC", name: "Yield Curve", desc: "US Treasury curve vs 1W/1M/3M ago, key spreads", scope: "market", aliases: ["YCRV", "CURVE", "BTMM"] },
  { code: "ECST", name: "Economic Statistics", desc: "US rates, inflation, growth and labor indicators with history", scope: "market", aliases: ["MACRO", "ECOS", "STATS"] },
  { code: "ECO", name: "Economic Calendar", desc: "Macro releases with survey, actual and prior", scope: "market", aliases: ["ECON"] },
  { code: "EVTS", name: "Earnings Calendar", desc: "Upcoming US earnings with estimates", scope: "market", aliases: ["EA", "ERNC"] },
  { code: "DVDC", name: "Dividend Calendar", desc: "Ex-dividend dates for the next two weeks", scope: "market", aliases: ["DIVC", "EXDIV", "DIVIDENDS"] },
  { code: "SPLT", name: "Split Calendar", desc: "Recent and upcoming stock splits", scope: "market", aliases: ["SPLITS"] },
  { code: "IPO", name: "IPO Calendar", desc: "Upcoming and recently priced offerings", scope: "market" },
  { code: "MNA", name: "Mergers & Acquisitions", desc: "Latest deal filings: acquirer and target", scope: "market", aliases: ["DEALS", "MERGERS"] },
  { code: "INSD", name: "Insider & Congress Trades", desc: "Latest Form 4 buys and sells, Senate and House disclosures", scope: "market", aliases: ["INSIDER", "FORM4", "GOV", "CONGRESS"] },
  { code: "LPAD", name: "Launchpad", desc: "Two to six live charts side by side", scope: "market", aliases: ["MGR", "MULTI"] },
  { code: "PORT", name: "Portfolio", desc: "Account-synced positions, P&L, performance vs S&P 500, exposure", scope: "market", aliases: ["PRTU", "PNL"] },
  { code: "ALRT", name: "Price Alerts", desc: "Account price alerts, delivered as app push notifications", scope: "market", aliases: ["ALERT", "ALERTS"] },
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
  | { kind: "ask"; question: string }
  | { kind: "empty" };

/**
 * Parse "NVDA", "NVDA HP", "AAPL US EQUITY DES", "WEI", "HELP" — and plain
 * English: "ASK why is oil up", "? compare nvda and amd", or any sentence.
 */
export function parseCommand(raw: string): Command {
  const text = raw.trim();
  const asked = text.match(/^(?:\?|ask\b)\s*(.+)$/i);
  if (asked && asked[1].trim().length > 2) return { kind: "ask", question: asked[1].trim() };

  const tokens = text.toUpperCase().split(/\s+/).filter((t) => t && !NOISE.has(t));
  if (!tokens.length) return { kind: "empty" };
  if (tokens.length === 1 && ["HELP", "?", "MENU", "FUNC"].includes(tokens[0])) return { kind: "help" };

  const lastFn = findFn(tokens[tokens.length - 1]);
  const firstFn = tokens.length > 1 ? findFn(tokens[0]) : undefined;

  // Three or more words that are not "<TICKER…> <FUNC>" read as a question.
  if (tokens.length >= 3 && (text.endsWith("?") || (!lastFn && !firstFn))) return { kind: "ask", question: text };

  if (lastFn) {
    const sym = tokens.slice(0, -1).join("");
    return { kind: "run", fn: lastFn, symbol: sym || undefined };
  }
  // "FUNC TICKER" order is accepted too.
  if (firstFn) return { kind: "run", fn: firstFn, symbol: tokens.slice(1).join("") };
  return { kind: "run", symbol: tokens.join("") };
}
