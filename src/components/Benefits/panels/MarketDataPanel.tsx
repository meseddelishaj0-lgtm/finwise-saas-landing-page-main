"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Sparkline from "./Sparkline";
import { useQuotes, fmtPrice, Quote } from "@/components/market/useQuotes";
import { useSparkSeries } from "./useSparkSeries";

const UP = "#34C759";
const DOWN = "#FF453A";

interface RowCfg {
  sym: string;
  chip: string;
  name: string;
}

// Live data — same quote + chart proxies the Terminal uses
const TABS: Record<string, { fx?: boolean; rows: RowCfg[] }> = {
  Indices: {
    rows: [
      { sym: "^GSPC", chip: "SPX", name: "S&P 500" },
      { sym: "^IXIC", chip: "NDQ", name: "NASDAQ" },
      { sym: "^DJI", chip: "DJI", name: "Dow Jones" },
      { sym: "^RUT", chip: "RUT", name: "Russell 2000" },
    ],
  },
  Crypto: {
    rows: [
      { sym: "BTCUSD", chip: "BTC", name: "Bitcoin" },
      { sym: "ETHUSD", chip: "ETH", name: "Ethereum" },
      { sym: "SOLUSD", chip: "SOL", name: "Solana" },
      { sym: "XRPUSD", chip: "XRP", name: "XRP" },
    ],
  },
  Commodities: {
    rows: [
      { sym: "GLD", chip: "GLD", name: "Gold (GLD)" },
      { sym: "SLV", chip: "SLV", name: "Silver (SLV)" },
      { sym: "USO", chip: "USO", name: "Crude Oil (USO)" },
      { sym: "UNG", chip: "UNG", name: "Nat Gas (UNG)" },
    ],
  },
  Forex: {
    fx: true,
    rows: [
      { sym: "EURUSD", chip: "EUR", name: "Euro / Dollar" },
      { sym: "GBPUSD", chip: "GBP", name: "Pound / Dollar" },
      { sym: "USDJPY", chip: "JPY", name: "Dollar / Yen" },
      { sym: "AUDUSD", chip: "AUD", name: "Aussie / Dollar" },
    ],
  },
};

const fmtRow = (q: Quote | undefined, fx: boolean): string => {
  if (!q || !Number.isFinite(q.price)) return "—";
  if (fx) return q.price.toFixed(4);
  return `$${fmtPrice(q.price)}`;
};

const PanelRow: React.FC<{ cfg: RowCfg; q?: Quote; fx: boolean; i: number }> = ({ cfg, q, fx, i }) => {
  const spark = useSparkSeries(cfg.sym, "1D", 20);
  const up = (q?.changePercent ?? 0) >= 0;
  const color = up ? UP : DOWN;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-11 h-11 flex-shrink-0 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <span className="text-yellow-400 font-bold text-[11px]">{cfg.chip}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-semibold truncate">{cfg.name}</p>
        <p className="text-gray-500 text-xs">{cfg.sym.replace("^", "")}</p>
      </div>
      {spark && spark.closes.length > 1 ? (
        <Sparkline
          data={spark.closes}
          width={64}
          height={26}
          color={color}
          className="flex-shrink-0 hidden sm:block"
        />
      ) : (
        <div className="w-16 h-[26px] flex-shrink-0 hidden sm:block rounded bg-white/[0.03] animate-pulse" />
      )}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-white text-sm font-semibold tabular-nums">{fmtRow(q, fx)}</p>
        {q ? (
          <span
            className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums"
            style={{
              color,
              backgroundColor: up ? "rgba(52,199,89,0.12)" : "rgba(255,69,58,0.12)",
            }}
          >
            {up ? "▲" : "▼"} {up ? "+" : ""}
            {(q.changePercent ?? 0).toFixed(2)}%
          </span>
        ) : (
          <span className="inline-block mt-0.5 h-[18px] w-14 rounded bg-white/[0.05] animate-pulse" />
        )}
      </div>
    </motion.div>
  );
};

const MarketDataPanel: React.FC = () => {
  const [tab, setTab] = useState<keyof typeof TABS>("Indices");
  const { fx = false, rows } = TABS[tab];
  const { quotes } = useQuotes(
    rows.map((r) => r.sym),
    30000
  );
  const bySym = new Map(quotes.map((q) => [q.symbol, q]));

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
        <span
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/25"
          style={{ color: UP }}
        >
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
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              t === tab
                ? "text-yellow-300 bg-yellow-400/10 border border-yellow-400/25"
                : "text-gray-500 bg-white/[0.03] border border-white/10 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </motion.div>

      {/* Quote rows */}
      <div className="flex-1 flex flex-col justify-between gap-2">
        {rows.map((cfg, i) => (
          <PanelRow key={cfg.sym} cfg={cfg} q={bySym.get(cfg.sym)} fx={fx} i={i} />
        ))}
      </div>

      <p className="text-[11px] text-gray-600 text-center mt-4">
        Live quotes &amp; today&apos;s session — equities, crypto, commodities &amp; FX
      </p>
    </div>
  );
};

export default MarketDataPanel;
