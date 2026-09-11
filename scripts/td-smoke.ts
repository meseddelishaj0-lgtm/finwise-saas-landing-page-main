import {
  getQuotes, getPrices, getStatistics, getProfile,
  getTimeSeries, performanceFromBars, getMovers, getMostActive,
  getSectorPerformance, searchSymbols, getMarketState,
  getEarningsCalendar, getIpoCalendar, getExchangeRate, latestIndicator,
} from "../src/lib/twelvedata";

const show = (label: string, v: unknown) =>
  console.log(`\n### ${label}\n` + JSON.stringify(v, null, 1).slice(0, 620));

(async () => {
  show("quotes mixed", await getQuotes(["MSFT", "^GSPC", "^IXIC", "BTCUSD", "EURUSD", "GCUSD"]));
  show("prices", await getPrices(["MSFT", "^DJI", "ETHUSD"]));
  const st = await getStatistics("MSFT");
  show("statistics", { marketCap: st?.marketCap, pe: st?.trailingPE, eps: st?.epsTTM, beta: st?.beta, d50: st?.day50MA, d200: st?.day200MA, float: st?.floatShares });
  const p = await getProfile("MSFT");
  show("profile", { name: p?.companyName, sector: p?.sector, ceo: p?.ceo, employees: p?.employees });
  const bars = await getTimeSeries("MSFT", "1day", 400);
  show("timeseries", { count: bars.length, first: bars[0], last: bars[bars.length - 1] });
  show("performance", performanceFromBars(bars));
  show("gainers", (await getMovers("gainers", { outputsize: 3 })));
  show("sectors", await getSectorPerformance());
  show("search", (await searchSymbols("apple", 3)));
  show("marketState", await getMarketState("NASDAQ"));
  show("earningsCal", (await getEarningsCalendar()).slice(0, 2));
  show("ipoCal", (await getIpoCalendar()).slice(0, 2));
  show("fx", await getExchangeRate("USD/JPY"));
  show("rsi", await latestIndicator("MSFT", "rsi", "1day", { time_period: 14 }));
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
