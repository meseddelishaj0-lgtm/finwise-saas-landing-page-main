# Market data providers — working brief

The website's market data is split between Twelve Data and Financial Modeling
Prep (FMP). This file is the contract every route follows.

## The split

Decided 2026-09-10, after measuring what the Twelve Data Pro plan actually
covers (see "Plan limits").

| Twelve Data — `@/lib/twelvedata` | FMP — `@/lib/fmp` |
| --- | --- |
| Quotes and prices for stocks, ETFs, crypto, FX, commodities | US index quotes and history (`^GSPC`, `^VIX`, …) — served inside the Twelve Data client |
| Charts, time series, technical indicators | Valuation fields on quotes: market cap, P/E, EPS, 50/200-day averages |
| Movers, sector ETFs, market state | Terminal fundamentals (`/api/market/fundamentals`) |
| Symbol search; IPO, dividend and split calendars | Screener universe, valuations and performance |
| Exchange rates | Analyst data: estimates, price targets, ratings; news (`stock_news`) |
| Treasury ETF ladder (`/api/bonds` `ladder`) | Treasury par-yield curve (`/api/bonds` `treasuryRates`), M&A deals, economic calendar |

Twelve Data Pro sells prices cheaply (1 credit a symbol) but fundamentals
expensively or not at all, and has no US indices, yields, deal or macro data.
FMP is already paid for news and its plan is full access, so all of that costs
nothing extra there.

## Rules

1. **Prices from Twelve Data; indices, fundamentals, valuation, analyst,
   macro and deal data, and news from FMP.** New FMP calls go through
   `@/lib/fmp`, which keeps the key server-side, caches, and survives FMP's
   occasional invalid JSON. The older FMP routes (news, terminal fundamentals,
   AI analysis, M&A) fetch FMP directly; leave them be.
2. **Preserve response shapes.** Pages and components were written against
   FMP's field names (`price`, `changesPercentage`, `marketCap`, `name`). The
   Twelve Data client already emits those names. If a route returns
   `{ data: [...] }`, it keeps returning `{ data: [...] }`.
3. **Degrade, don't crash.** Helpers return `null` or `[]` rather than
   throwing (`td()` is the one that throws; `tdSafe()` and `fmp()` do not).
   Keep the stale-cache-on-failure behaviour where routes have it.
4. **Mind the credit budget.** Pro is 987 credits a minute, and the mobile app
   uses the same key. Only 1-credit endpoints may be called once per symbol
   across a list. Never fan out `statistics` (50 credits a symbol) — take
   market cap and P/E from `getQuoteStats`.
5. **Never judge the plan with AAPL.** AAPL is a Twelve Data demo symbol:
   every endpoint answers for it at 1 credit. Probe with MSFT and read the
   `api-credits-used` response header.

## Plan limits — Twelve Data Pro

Measured on MSFT, 2026-09-10.

| Credits | Endpoints |
| --- | --- |
| 1 per symbol | `quote`, `price`, `time_series`, `logo`, technical indicators |
| 10 | `profile` |
| 20 | `earnings`, `dividends`, `splits` |
| ~40 | `earnings_calendar` |
| 50 | `statistics` |
| 100 | `market_movers`, `income_statement`, `balance_sheet`, `cash_flow` |
| 200 | `insider_transactions` |

**Ultra/Enterprise only** (403 on Pro): `earnings_estimate`,
`revenue_estimate`, `price_target`, `recommendations`,
`analyst_ratings/us_equities`, `edgar_filings/archive`, `key_executives`,
`institutional_holders`.

**Also missing:** US index symbols (served from FMP, below), a news feed,
statement history beyond 6 annual or 6 quarterly rows ("Full access to
historical data is available only in the Enterprise plan"), and future
earnings dates (`earnings` lists reported quarters only; `earnings_calendar`
misses most large caps).

## US indices

`^GSPC`, `^IXIC`, `^DJI`, `^RUT`, `^VIX`, `^TNX` and friends are not sold on
the Twelve Data plan. `getQuotes`, `getQuote`, `getPrices` and `getTimeSeries`
detect them (`isProxiedIndex`) and fetch them from FMP at their real levels,
so callers keep asking for `"^GSPC"` and get the S&P 500 at ~7,600 — never
SPY's ~760 under the index's name. `INDEX_PROXY` still maps each index to its
tracking ETF for the Twelve Data-only calls (statistics, indicators) that go
through `toTdSymbol()`.

## Client API — `@/lib/twelvedata`

```ts
// Raw access (throws TwelveDataError) / safe access (returns null)
td<T>(path, params, { ttl, cost, allowStale })
tdSafe<T>(path, params, opts)

// Symbols
toTdSymbol(sym)        // "^GSPC" -> "SPY", "BTCUSD" -> "BTC/USD", "USDJPY" -> "USD/JPY"
classify(sym)          // "stock" | "index" | "crypto" | "forex" | "commodity"
isProxiedIndex(sym)    // true for the US index symbols served from FMP
displayName(sym, up)   // "^GSPC" -> "S&P 500"
INDEX_PROXY            // index -> tracking ETF

// Quotes  (Quote uses FMP field names: price, changesPercentage…)
getQuotes(symbols[], { ttl })   // batched, order preserved; 1 credit a symbol, indices via FMP
getQuote(symbol)
getPrices(symbols[])            // { SYM: price } — cheapest option

// Single-symbol fundamentals — never call these across a list
getStatistics(symbol)  // 50 credits: market cap, P/E, margins, float, 50/200 MA, beta, dividend…
getQuoteWithStats(symbol)
getProfile(symbol)     // 10 credits: sector, industry, CEO, employees, description, logo
getLogo(symbol)        // public, keyless logo URL — safe to send to the browser

// Series (indices via FMP)
getTimeSeries(symbol, interval, outputsize, { timezone, startDate, endDate })
performanceFromBars(bars)  // { "1D","5D","1M","3M","6M","ytd","1Y","3Y","5Y" }

// Discovery & market structure
getMovers("gainers"|"losers", { market, outputsize, country })  // 100 credits
getMostActive(limit)
getSectorPerformance()   // synthesised from the 11 SPDR sector ETFs
searchSymbols(query, limit)
getMarketState(exchange)

// Calendars
getEarningsCalendar(start?, end?)   // sparse — misses most large caps
getIpoCalendar()
getDividendsCalendar(start?, end?)
getSplitsCalendar(start?, end?)

// Currencies & commodities
getExchangeRate("USD/JPY")
convertCurrency(from, to, amount)
COMMODITIES            // curated list with Twelve Data symbols

// Technicals — any Twelve Data indicator by name
indicator(symbol, "rsi", "1day", { time_period: 14 }, outputsize)
latestIndicator(symbol, "macd", "1day")
```

## Client API — `@/lib/fmp`

```ts
fmp<T>(path, params, ttl)   // fmp("v3/quote/AAPL,MSFT") — null on failure, last good payload on error
getQuoteStats(symbols[])    // { SYM: { marketCap, pe, eps, priceAvg50, priceAvg200,
                            //          sharesOutstanding, avgVolume, earningsAnnouncement } }
```

## Twelve Data stand-ins for FMP datasets

Price-side features that moved to Twelve Data and had no direct equivalent.
Each stand-in is noted in its route and labelled honestly in the UI.

| Was (FMP) | Now |
| --- | --- |
| `stock_market/actives` | gainers + losers merged, re-ranked by turnover |
| `stock/sectors-performance` | 11 SPDR sector ETF quotes |
| `government_bonds_yield` (global) | Treasury ETF ladder, shown as fund prices, not yields — US Treasury yields themselves come from FMP |
| `fear_greed_index` | breadth score from sector ETFs + VIXY |
