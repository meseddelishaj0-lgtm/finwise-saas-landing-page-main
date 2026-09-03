"use client";

import React, { useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function ROICalculatorPage() {
  const [gain, setGain] = useState("");
  const [cost, setCost] = useState("");
  const [roi, setRoi] = useState<number | null>(null);

  const calculateROI = () => {
    const g = parseFloat(gain);
    const c = parseFloat(cost);
    if (isNaN(g) || isNaN(c) || c === 0) {
      setRoi(null);
      return;
    }
    const result = ((g - c) / c) * 100;
    setRoi(result);
  };

  const resetForm = () => {
    setGain("");
    setCost("");
    setRoi(null);
  };

  return (
    <main className="min-h-screen bg-night text-ivory flex flex-col items-center px-6 py-14 md:py-20">
      {/* Header */}
      <Reveal className="text-center max-w-2xl mb-10">
        <CommandLine cmd="CAL" note="return on investment" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
          ROI calculator
        </h1>
        <p className="mt-5 text-lg text-gray-400 leading-relaxed">
          Calculate your Return on Investment (ROI) instantly to measure the profitability of your business or project.
        </p>
      </Reveal>

      {/* Calculator Card */}
      <div className="w-full max-w-md card-night p-8">
        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Total Gain / Return ($)
        </label>
        <input
          type="number"
          value={gain}
          onChange={(e) => setGain(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 12000"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Total Cost / Investment ($)
        </label>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 10000"
        />

        <div className="flex gap-3">
          <button
            onClick={calculateROI}
            className="btn-gold flex-1 py-3"
          >
            Calculate
          </button>
          <button
            onClick={resetForm}
            className="btn-ghost-gold flex-1 py-3"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Result Display */}
      {roi !== null && (
        <Reveal className="max-w-md w-full mt-10 card-night p-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-ivory mb-2">Your ROI</h2>
          <p className="font-monodata tabular-nums text-3xl font-semibold text-gold">
            {roi.toFixed(2)}%
          </p>
          <p className="text-gray-400 mt-2">
            {roi >= 0
              ? "Positive ROI indicates a profitable investment."
              : "Negative ROI indicates a loss on investment."}
          </p>
        </Reveal>
      )}
      <Reveal className="mt-12">
        <Link href="/resources/tools-calculator" className="btn-ghost-gold px-5 py-2.5 text-sm">
          ← Back to calculators
        </Link>
      </Reveal>
    </main>
  );
}
