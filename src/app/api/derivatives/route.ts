import { NextResponse } from "next/server";
import { COMMODITIES, getQuotes } from "@/lib/twelvedata";

export const runtime = "nodejs";

// Derivatives board. Twelve Data sells no options chains, swap curves or CDS
// spreads, so each tab is served by the closest instrument it does carry, and
// the response names what is actually being quoted.

const FUTURES = COMMODITIES.map((c) => c.symbol);

const FX = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD",
  "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY",
];

// Rate- and credit-sensitive ETFs: the tradable stand-ins for swap and CDS
// exposure, which are not sold as data on this plan.
const RATES = ["TLT", "IEF", "IEI", "SHY", "TIP", "MBB"];
const CREDIT = ["HYG", "JNK", "LQD", "EMB", "BKLN", "SJNK"];

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    let symbols: string[];
    let note: string | undefined;
    let names: Map<string, string> | undefined;

    switch (type) {
      case "options":
        // No options chain data on this provider.
        return NextResponse.json({
          data: [],
          unavailable: true,
          note: "Options chain data is not available from our market-data provider.",
        });
      case "swaps":
        symbols = RATES;
        note =
          "Swap curves are not available from our market-data provider. Shown: " +
          "rate-sensitive Treasury and mortgage ETFs, which carry comparable duration exposure.";
        break;
      case "forwards":
        symbols = FX;
        note =
          "FX forwards are not available. Shown: spot rates for the same currency pairs.";
        break;
      case "credit":
        symbols = CREDIT;
        note =
          "Credit default swap spreads are not available. Shown: high-yield and " +
          "investment-grade credit ETFs, which move with the same risk premium.";
        break;
      case "futures":
      default:
        symbols = FUTURES;
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
      previousClose: q.previousClose,
      volume: q.volume,
    }));

    return NextResponse.json({ data, ...(note ? { note } : {}) });
  } catch (error) {
    console.error("Derivatives API error:", error);
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
