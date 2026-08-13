import { IBenefit } from "@/types";

// NOTE: titles are keys into BenefitSection's PANELS map — don't rename
// without updating the panel components.
const benefits: IBenefit[] = [
  {
    title: "Smart Analysis",
    description:
      "Every symbol, scored. AI ratings, momentum reads, and risk signals are computed on live market data — so you read the market instead of just watching it.",
    bullets: [
      {
        title: "AI ratings",
        description:
          "Buy, hold, and sell calls with the reasoning behind them, on every covered stock.",
        icon: undefined,
      },
      {
        title: "Momentum & trend signals",
        description:
          "Directional reads that update as the tape moves, not at the end of the day.",
        icon: undefined,
      },
      {
        title: "Risk & volatility checks",
        description:
          "Know how much a position can swing before you size it.",
        icon: undefined,
      },
    ],
  },
  {
    title: "AI Stock Research",
    description:
      "Deep research without the analyst desk. Fundamentals, filings, and forecasts distilled into briefs you can actually read before the open.",
    bullets: [
      {
        title: "Research briefs",
        description:
          "Plain-English summaries of what matters in a company's numbers and news.",
        icon: undefined,
      },
      {
        title: "27 fundamental datasets",
        description:
          "Income, balance sheet, ratios, growth, and more — the full picture on one page.",
        icon: undefined,
      },
      {
        title: "Track record you can audit",
        description:
          "Every AI pick is logged and measured against the S&P 500, in public.",
        icon: undefined,
      },
    ],
  },
  {
    title: "Market Data",
    description:
      "Equities, ETFs, indices, crypto, forex, and commodities — streaming onto one desk, with terminal-grade charts under every symbol.",
    bullets: [
      {
        title: "Live price feeds",
        description:
          "Low-latency quotes across global exchanges, refreshed around the clock.",
      },
      {
        title: "Every asset class",
        description:
          "One search reaches stocks, funds, coins, currencies, and futures alike.",
      },
      {
        title: "Terminal-grade charts",
        description:
          "Intraday to decade view, with volume, ranges, and pre/post sessions.",
      },
    ],
  },
];

export default benefits;
