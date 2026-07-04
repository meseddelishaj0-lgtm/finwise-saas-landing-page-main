"use client";

import React from "react";
import { motion } from "framer-motion";
import Sparkline from "./Sparkline";

const UP = "#34C759";
const DOWN = "#FF453A";

interface QuoteRow {
  symbol: string;
  chip: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  spark: number[];
}

const rows: QuoteRow[] = [
  { symbol: "SPX", chip: "SPX", name: "S&P 500", price: "6,874.12", change: "+0.42%", up: true, spark: [40, 42, 41, 44, 43, 46, 45, 48, 47, 50] },
  { symbol: "NDX", chip: "NDX", name: "NASDAQ 100", price: "25,310.55", change: "+0.68%", up: true, spark: [30, 33, 32, 36, 35, 39, 38, 42, 44, 46] },
  { symbol: "DJI", chip: "DJI", name: "Dow Jones", price: "44,912.30", change: "-0.15%", up: false, spark: [50, 49, 51, 48, 49, 47, 48, 46, 47, 45] },
  { symbol: "BTC", chip: "BTC", name: "Bitcoin", price: "62,130.00", change: "+1.05%", up: true, spark: [30, 34, 32, 38, 36, 41, 39, 45, 43, 48] },
  { symbol: "GOLD", chip: "GOLD", name: "Gold Spot", price: "3,412.80", change: "+0.23%", up: true, spark: [42, 43, 42, 44, 45, 44, 46, 45, 47, 48] },
  { symbol: "EUR/USD", chip: "EUR", name: "Euro / Dollar", price: "1.0921", change: "-0.08%", up: false, spark: [48, 47, 48, 46, 47, 45, 46, 44, 45, 44] },
];

const tabs = ["Indices", "Crypto", "Commodities", "Forex"];

const MarketDataPanel: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-5"
      >
        <span className="text-white font-semibold text-lg">Markets</span>
        <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/25" style={{ color: UP }}>
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: UP }} />
            <span className="relative inline-flex rounded-full w-2 h-2" style={{ backgroundColor: UP }} />
          </span>
          LIVE
        </span>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-2 mb-4"
      >
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              i === 0
                ? "text-yellow-300 bg-yellow-400/10 border border-yellow-400/25"
                : "text-gray-500 bg-white/[0.03] border border-white/10"
            }`}
          >
            {t}
          </span>
        ))}
      </motion.div>

      {/* Quote rows */}
      <div className="flex-1 flex flex-col justify-between gap-2">
        {rows.map((q, i) => (
          <motion.div
            key={q.symbol}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-11 h-11 flex-shrink-0 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-[11px]">{q.chip}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{q.name}</p>
              <p className="text-gray-500 text-xs">{q.symbol}</p>
            </div>
            <Sparkline
              data={q.spark}
              width={64}
              height={26}
              color={q.up ? UP : DOWN}
              className="flex-shrink-0 hidden sm:block"
            />
            <div className="text-right flex-shrink-0 w-28">
              <p className="text-white text-sm font-semibold tabular-nums">${q.price}</p>
              <span
                className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums"
                style={{
                  color: q.up ? UP : DOWN,
                  backgroundColor: q.up ? "rgba(52,199,89,0.12)" : "rgba(255,69,58,0.12)",
                }}
              >
                {q.up ? "▲" : "▼"} {q.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-gray-600 text-center mt-4">
        Streaming quotes across equities, crypto, commodities &amp; FX
      </p>
    </div>
  );
};

export default MarketDataPanel;
