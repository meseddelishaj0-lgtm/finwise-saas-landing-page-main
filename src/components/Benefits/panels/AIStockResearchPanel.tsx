"use client";

import React from "react";
import { motion } from "framer-motion";
import Sparkline from "./Sparkline";

const GOLD = "#FACC15";
const UP = "#34C759";
const DOWN = "#FF453A";

const priceHistory = [178, 180, 179, 183, 182, 186, 185, 188, 187, 190, 189, 192, 194, 192];

const scores = [
  { label: "Fundamentals", value: 92 },
  { label: "Momentum", value: 84 },
  { label: "Sentiment", value: 77 },
];

const insights = [
  { tone: UP, tag: "Bull", text: "Data-center revenue accelerating for a 6th straight quarter." },
  { tone: DOWN, tag: "Risk", text: "Valuation sits above the semiconductor sector median." },
  { tone: GOLD, tag: "Catalyst", text: "Next earnings report expected late August." },
];

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const AIStockResearchPanel: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col gap-5 p-6 md:p-8">
      {/* Stock header */}
      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center">
            <span className="text-yellow-400 font-bold text-sm">NV</span>
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">NVDA</p>
            <p className="text-gray-500 text-xs">NVIDIA Corp.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-lg tabular-nums leading-tight">$192.44</p>
          <span
            className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums"
            style={{ color: UP, backgroundColor: "rgba(52,199,89,0.12)" }}
          >
            ▲ +2.31%
          </span>
        </div>
      </motion.div>

      {/* Price chart */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
        <Sparkline data={priceHistory} width={480} height={110} color={UP} area className="w-full" />
        <div className="flex justify-between mt-2 text-[11px] text-gray-600">
          <span>9:30 AM</span>
          <span>12:00 PM</span>
          <span>4:00 PM</span>
        </div>
      </motion.div>

      {/* AI score */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-300 text-sm font-semibold">AI Research Score</p>
          <p className="text-white font-bold text-xl tabular-nums">
            8.6<span className="text-gray-500 text-sm font-normal"> / 10</span>
          </p>
        </div>
        <div className="space-y-3">
          {scores.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-28 flex-shrink-0 text-[13px] text-gray-400">{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: GOLD, opacity: 0.85 }}
                />
              </div>
              <span className="w-8 text-right text-[13px] text-gray-300 tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI insights */}
      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-2.5">
        {insights.map((ins) => (
          <div
            key={ins.tag}
            className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3"
          >
            <span
              className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: ins.tone }}
            />
            <p className="text-[13px] leading-relaxed text-gray-400">
              <strong className="text-gray-200 font-semibold">{ins.tag}:</strong> {ins.text}
            </p>
          </div>
        ))}
      </motion.div>

      <p className="text-[11px] text-gray-600 text-center mt-auto">Illustrative example of AI research output</p>
    </div>
  );
};

export default AIStockResearchPanel;
