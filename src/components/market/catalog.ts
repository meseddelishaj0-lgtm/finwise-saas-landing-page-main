// Asset-class catalog for the terminal Markets browser.
// Each list stays ≤ 30 symbols (quotes API cap per request).

export interface Category {
  key: string;
  label: string;
  icon: string;
  symbols: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: "stocks",
    label: "Stocks",
    icon: "📈",
    symbols: [
      "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "LLY",
      "V", "MA", "UNH", "XOM", "WMT", "HD", "PG", "COST", "ORCL", "NFLX",
      "AMD", "CRM", "BAC", "KO", "PEP", "DIS", "CSCO", "INTC", "PLTR", "UBER",
    ],
  },
  {
    key: "etfs",
    label: "ETFs",
    icon: "🧺",
    symbols: [
      "SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "XLK", "XLF", "XLE", "XLV",
      "XLI", "XLP", "XLU", "XLY", "ARKK", "SCHD", "JEPI", "GLD", "SLV", "USO",
      "SMH", "SOXX", "VNQ", "EEM", "EFA", "BITO", "IBIT", "TQQQ", "SQQQ", "VXX",
    ],
  },
  {
    key: "indices",
    label: "Indices",
    icon: "🏛️",
    symbols: ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "^TNX", "^TYX", "^FVX"],
  },
  {
    key: "crypto",
    label: "Crypto",
    icon: "₿",
    symbols: [
      "BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD",
      "AVAXUSD", "DOTUSD", "LINKUSD", "LTCUSD", "BCHUSD", "UNIUSD", "XLMUSD",
      "NEARUSD", "APTUSD", "FILUSD", "ATOMUSD",
    ],
  },
  {
    key: "forex",
    label: "Forex",
    icon: "💱",
    symbols: [
      "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
      "EURGBP", "EURJPY", "GBPJPY", "USDMXN", "USDCNY",
    ],
  },
  {
    key: "commodities",
    label: "Commodities",
    icon: "🛢️",
    symbols: ["GCUSD", "SIUSD", "CLUSD", "BZUSD", "NGUSD", "HGUSD", "PLUSD", "PAUSD"],
  },
  {
    key: "bonds",
    label: "Bonds",
    icon: "🏦",
    symbols: [
      "^TNX", "^TYX", "^FVX", "^IRX",
      "TLT", "IEF", "SHY", "BND", "AGG", "LQD", "HYG", "TIP", "MUB", "VCIT", "VCSH",
    ],
  },
];

// Friendly overrides where provider names are noisy
export const NAME_OVERRIDES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ Composite",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "^VIX": "CBOE Volatility",
  "^TNX": "US 10Y Treasury Yield",
  "^TYX": "US 30Y Treasury Yield",
  "^FVX": "US 5Y Treasury Yield",
  "^IRX": "US 13W T-Bill Yield",
  GCUSD: "Gold",
  SIUSD: "Silver",
  CLUSD: "Crude Oil WTI",
  BZUSD: "Brent Crude",
  NGUSD: "Natural Gas",
  HGUSD: "Copper",
  PLUSD: "Platinum",
  PAUSD: "Palladium",
  EURUSD: "Euro / US Dollar",
  GBPUSD: "British Pound / USD",
  USDJPY: "US Dollar / Yen",
  USDCHF: "US Dollar / Swiss Franc",
  AUDUSD: "Australian Dollar / USD",
  USDCAD: "US Dollar / CAD",
  NZDUSD: "NZ Dollar / USD",
  EURGBP: "Euro / Pound",
  EURJPY: "Euro / Yen",
  GBPJPY: "Pound / Yen",
  USDMXN: "US Dollar / Peso",
  USDCNY: "US Dollar / Yuan",
};
