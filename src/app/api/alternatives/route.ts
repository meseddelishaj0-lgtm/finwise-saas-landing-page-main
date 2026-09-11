import { NextResponse } from "next/server";
import { COMMODITIES, getQuotes } from "@/lib/twelvedata";

export const runtime = "nodejs";

// Alternatives board. Private equity, hedge fund and private credit returns are
// not market data anyone sells on a quote API, so each tab uses the listed
// vehicles that track the asset class, and the response says so.

const REITS = ["VNQ", "SCHH", "IYR", "XLRE", "REET", "O", "PLD", "AMT", "SPG", "WELL"];
const PRIVATE_EQUITY = ["PSP", "BX", "KKR", "APO", "ARES", "CG", "TPG", "OWL"];
const HEDGE_PROXIES = ["QAI", "MNA", "BTAL", "HDG", "FMF", "WTMF"];
const PRIVATE_CREDIT = ["ARCC", "OBDC", "BXSL", "MAIN", "HTGC", "PSEC"];

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    let symbols: string[];
    let note: string | undefined;
    let names: Map<string, string> | undefined;

    switch (type) {
      case "reits":
        symbols = REITS;
        note = "Listed REITs and real-estate funds.";
        break;
      case "private_equity":
        symbols = PRIVATE_EQUITY;
        note =
          "Private equity marks are not public data. Shown: listed alternative " +
          "asset managers and a listed private-equity fund index.";
        break;
      case "hedge_funds":
        symbols = HEDGE_PROXIES;
        note =
          "Hedge fund returns are not public data. Shown: liquid alternative " +
          "funds that replicate common hedge fund strategies.";
        break;
      case "private_credit":
        symbols = PRIVATE_CREDIT;
        note =
          "Private credit marks are not public data. Shown: listed business " +
          "development companies, the closest tradable equivalent.";
        break;
      case "commodities":
      default:
        symbols = COMMODITIES.map((c) => c.symbol);
        names = new Map(COMMODITIES.map((c) => [c.symbol, c.name]));
        break;
    }

    const quotes = await getQuotes(symbols, { ttl: 60_000 });
    const data = quotes.map((q) => ({
      symbol: q.symbol,
      name: names?.get(q.symbol) || q.name,
      price: q.price,
      change: q.change,
      changesPercentage: q.changesPercentage,
      dayLow: q.dayLow,
      dayHigh: q.dayHigh,
      yearHigh: q.yearHigh,
      yearLow: q.yearLow,
      volume: q.volume,
    }));

    return NextResponse.json({ data, ...(note ? { note } : {}) });
  } catch (error) {
    console.error("Alternatives API error:", error);
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
