"use client";

import React from "react";
import { motion } from "framer-motion";
import Sparkline from "./Sparkline";

const GOLD = "#FACC15";
const UP = "#34C759";

const allocation = [
  { label: "Technology", pct: 38 },
  { label: "ETFs & Index", pct: 26 },
  { label: "Healthcare", pct: 18 },
  { label: "Energy", pct: 11 },
  { label: "Cash", pct: 7 },
];

// History (solid) then ML projection (dashed)
const forecast = [52, 54, 53, 57, 60, 58, 63, 66, 65, 70, 73, 76, 80, 84];
const FORECAST_SPLIT = 9;

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const SmartAnalysisPanel: React.FC = () => {
  const score = 87;
  const r = 50;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="w-full h-full flex flex-col gap-5 p-6 md:p-8">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
        <span className="text-white font-semibold text-lg">Portfolio Health</span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-yellow-300 bg-yellow-400/10 border border-yellow-400/25">
          AI ENGINE
        </span>
      </motion.div>

      {/* Score ring */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="flex items-center gap-6">
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={GOLD}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white leading-none">{score}</span>
            <span className="text-[11px] text-gray-500 mt-1">/ 100</span>
          </div>
        </div>
        <div>
          <p className="text-yellow-400 font-semibold text-xl">Excellent</p>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Risk-adjusted score across 24 holdings, rebalanced weekly by AI.
          </p>
        </div>
      </motion.div>

      {/* Allocation bars */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
        <p className="text-gray-300 text-sm font-semibold mb-4">Smart Categorization</p>
        <div className="space-y-3">
          {allocation.map((a) => (
            <div key={a.label} className="flex items-center gap-3">
              <span className="w-28 flex-shrink-0 text-[13px] text-gray-400">{a.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${a.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: GOLD, opacity: 0.85 }}
                />
              </div>
              <span className="w-9 text-right text-[13px] text-gray-300 tabular-nums">{a.pct}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Goal + forecast */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <p className="text-gray-300 text-sm font-semibold">Goal Progress</p>
          <p className="text-gray-500 text-xs mt-0.5">Retirement fund · $25K target</p>
          <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "68%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: GOLD }}
            />
          </div>
          <p className="text-white text-sm font-semibold mt-2 tabular-nums">
            68% <span className="text-gray-500 font-normal">on track</span>
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-gray-300 text-sm font-semibold">ML Forecast</p>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-bold tabular-nums"
              style={{ color: UP, backgroundColor: "rgba(52,199,89,0.12)" }}
            >
              ▲ +12.4%
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">Projected 6-month growth</p>
          <div className="mt-3">
            <Sparkline
              data={forecast}
              dashedFrom={FORECAST_SPLIT}
              width={210}
              height={56}
              color={GOLD}
              area
              className="w-full"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartAnalysisPanel;
