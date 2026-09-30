// Symbol universes for the terminal's market-wide functions (WEI, FXC,
// CMDTY). Shared by the /api/market/global route and the client panels.

export interface UniverseItem {
  symbol: string;
  name: string;
  region?: string;
  group?: string;
}

/** World equity indices (WEI), grouped by region. All quoted from FMP. */
export const WORLD_INDICES: UniverseItem[] = [
  { symbol: "^GSPC", name: "S&P 500", region: "Americas" },
  { symbol: "^DJI", name: "Dow Jones Industrial", region: "Americas" },
  { symbol: "^IXIC", name: "Nasdaq Composite", region: "Americas" },
  { symbol: "^NDX", name: "Nasdaq 100", region: "Americas" },
  { symbol: "^RUT", name: "Russell 2000", region: "Americas" },
  { symbol: "^GSPTSE", name: "S&P/TSX Composite", region: "Americas" },
  { symbol: "^BVSP", name: "Brazil Ibovespa", region: "Americas" },
  { symbol: "^MXX", name: "Mexico IPC", region: "Americas" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", region: "EMEA" },
  { symbol: "^FTSE", name: "FTSE 100", region: "EMEA" },
  { symbol: "^GDAXI", name: "DAX", region: "EMEA" },
  { symbol: "^FCHI", name: "CAC 40", region: "EMEA" },
  { symbol: "^IBEX", name: "IBEX 35", region: "EMEA" },
  { symbol: "^SSMI", name: "Swiss Market", region: "EMEA" },
  { symbol: "^AEX", name: "AEX", region: "EMEA" },
  { symbol: "^N225", name: "Nikkei 225", region: "Asia/Pacific" },
  { symbol: "^HSI", name: "Hang Seng", region: "Asia/Pacific" },
  { symbol: "000001.SS", name: "Shanghai Composite", region: "Asia/Pacific" },
  { symbol: "^KS11", name: "KOSPI", region: "Asia/Pacific" },
  { symbol: "^TWII", name: "Taiwan Weighted", region: "Asia/Pacific" },
  { symbol: "^BSESN", name: "BSE Sensex", region: "Asia/Pacific" },
  { symbol: "^AXJO", name: "S&P/ASX 200", region: "Asia/Pacific" },
];

/** Currencies in the FX cross matrix (FXC) and the USD pair that quotes each. */
export const FX_CURRENCIES: { code: string; pair: string | null; usdIsBase: boolean }[] = [
  { code: "USD", pair: null, usdIsBase: false },
  { code: "EUR", pair: "EURUSD", usdIsBase: false },
  { code: "JPY", pair: "USDJPY", usdIsBase: true },
  { code: "GBP", pair: "GBPUSD", usdIsBase: false },
  { code: "CHF", pair: "USDCHF", usdIsBase: true },
  { code: "CAD", pair: "USDCAD", usdIsBase: true },
  { code: "AUD", pair: "AUDUSD", usdIsBase: false },
  { code: "NZD", pair: "NZDUSD", usdIsBase: false },
  { code: "CNY", pair: "USDCNY", usdIsBase: true },
  { code: "MXN", pair: "USDMXN", usdIsBase: true },
];

/** Futures board (CMDTY). Quoted from FMP. */
export const FUTURES: UniverseItem[] = [
  { symbol: "ESUSD", name: "E-mini S&P 500", group: "Equity Index" },
  { symbol: "NQUSD", name: "E-mini Nasdaq 100", group: "Equity Index" },
  { symbol: "YMUSD", name: "Mini Dow", group: "Equity Index" },
  { symbol: "RTYUSD", name: "Russell 2000", group: "Equity Index" },
  { symbol: "ZNUSD", name: "10Y T-Note", group: "Rates & FX" },
  { symbol: "ZBUSD", name: "30Y T-Bond", group: "Rates & FX" },
  { symbol: "DXUSD", name: "US Dollar Index", group: "Rates & FX" },
  { symbol: "CLUSD", name: "WTI Crude", group: "Energy" },
  { symbol: "BZUSD", name: "Brent Crude", group: "Energy" },
  { symbol: "NGUSD", name: "Natural Gas", group: "Energy" },
  { symbol: "RBUSD", name: "RBOB Gasoline", group: "Energy" },
  { symbol: "HOUSD", name: "Heating Oil", group: "Energy" },
  { symbol: "GCUSD", name: "Gold", group: "Metals" },
  { symbol: "SIUSD", name: "Silver", group: "Metals" },
  { symbol: "HGUSD", name: "Copper", group: "Metals" },
  { symbol: "PLUSD", name: "Platinum", group: "Metals" },
  { symbol: "PAUSD", name: "Palladium", group: "Metals" },
  { symbol: "ALIUSD", name: "Aluminum", group: "Metals" },
  { symbol: "ZCUSX", name: "Corn", group: "Agriculture" },
  { symbol: "ZSUSX", name: "Soybeans", group: "Agriculture" },
  { symbol: "ZOUSX", name: "Oats", group: "Agriculture" },
  { symbol: "LEUSX", name: "Live Cattle", group: "Agriculture" },
  { symbol: "HEUSX", name: "Lean Hogs", group: "Agriculture" },
  { symbol: "LBUSD", name: "Lumber", group: "Agriculture" },
  { symbol: "KCUSX", name: "Coffee", group: "Softs" },
  { symbol: "SBUSX", name: "Sugar", group: "Softs" },
  { symbol: "CCUSD", name: "Cocoa", group: "Softs" },
  { symbol: "CTUSX", name: "Cotton", group: "Softs" },
  { symbol: "OJUSX", name: "Orange Juice", group: "Softs" },
];
