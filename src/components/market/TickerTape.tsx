"use client";

import React from "react";
import Link from "next/link";
import { useQuotes, fmtPrice } from "./useQuotes";

// Custom scrolling ticker tape — our own data via /api/market/quotes,
// no third-party widgets. Seamless loop: the row is rendered twice and
// animated -50%; pauses on hover.

const TAPE_SYMBOLS = [
  "^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX",
  "NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "META",
  "BTCUSD", "ETHUSD", "SOLUSD", "GLD", "USO",
];

const NAMES: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "^DJI": "DOW", "^RUT": "RUSSELL", "^VIX": "VIX",
  BTCUSD: "BTC", ETHUSD: "ETH", SOLUSD: "SOL", GLD: "GOLD", USO: "OIL",
};

const TickerTape: React.FC = () => {
  const { quotes } = useQuotes(TAPE_SYMBOLS, 30000);

  if (quotes.length === 0) {
    return (
      <div className="w-full h-[38px] border-y border-white/10 bg-night" />
    );
  }

  const items = quotes.map((q) => {
    const up = (q.changePercent || 0) >= 0;
    return (
      <Link
        key={q.symbol}
        href={`/terminal?symbol=${encodeURIComponent(q.symbol)}`}
        className="inline-flex items-center gap-2 px-5 border-r border-white/5 hover:bg-white/[0.03] h-full transition-colors"
      >
        <span className="font-monodata font-semibold text-[12px] text-gray-200">
          {NAMES[q.symbol] || q.symbol}
        </span>
        <span className="font-monodata text-[12px] tabular-nums text-gray-400">{fmtPrice(q.price)}</span>
        <span className={`font-monodata text-[11px] font-semibold tabular-nums ${up ? "text-green-400" : "text-red-400"}`}>
          {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
        </span>
      </Link>
    );
  });

  return (
    <div
      className="group w-full h-[38px] overflow-hidden border-y border-white/10 bg-night"
    >
      <style>{`
        @keyframes wss-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex h-full w-max items-stretch group-hover:[animation-play-state:paused]"
        style={{ animation: "wss-marquee 60s linear infinite" }}
      >
        <div className="flex h-full items-stretch">{items}</div>
        <div className="flex h-full items-stretch" aria-hidden="true">{items}</div>
      </div>
    </div>
  );
};

export default TickerTape;
