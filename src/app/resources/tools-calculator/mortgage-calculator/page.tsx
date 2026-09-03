"use client";

import React, { useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function MortgageCalculatorPage() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  const calculateMortgage = () => {
    const P = parseFloat(principal);
    const annualRate = parseFloat(rate);
    const Y = parseFloat(years);

    if (isNaN(P) || isNaN(annualRate) || isNaN(Y) || P <= 0 || annualRate < 0 || Y <= 0) {
      setMonthlyPayment(null);
      return;
    }

    const r = annualRate / 100 / 12; // monthly interest rate
    const n = Y * 12; // total number of monthly payments

    const M =
      r === 0
        ? P / n
        : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    setMonthlyPayment(M);
  };

  const reset = () => {
    setPrincipal("");
    setRate("");
    setYears("");
    setMonthlyPayment(null);
  };

  return (
    <main className="min-h-screen bg-night text-ivory flex flex-col items-center px-6 py-14 md:py-20">
      {/* Hero Section */}
      <Reveal className="text-center max-w-2xl mb-10">
        <CommandLine cmd="CAL" note="mortgage payment" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
          Mortgage calculator
        </h1>
        <p className="mt-5 text-lg text-gray-400 leading-relaxed">
          Calculate your estimated monthly mortgage payment — including principal and interest — to plan your next property purchase.
        </p>
      </Reveal>

      {/* Calculator Card */}
      <div className="w-full max-w-md card-night p-8">
        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Loan Amount ($)
        </label>
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 350000"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Annual Interest Rate (%)
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 6.5"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Loan Term (Years)
        </label>
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 30"
        />

        <div className="flex gap-3">
          <button
            onClick={calculateMortgage}
            className="btn-gold flex-1 py-3"
          >
            Calculate
          </button>
          <button
            onClick={reset}
            className="btn-ghost-gold flex-1 py-3"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Result Display */}
      {monthlyPayment !== null && (
        <Reveal className="max-w-md w-full mt-10 card-night p-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-ivory mb-2">Monthly payment</h2>
          <p className="font-monodata tabular-nums text-3xl font-semibold text-gold">
            ${monthlyPayment.toFixed(2)}
          </p>
          <p className="text-gray-400 mt-2">
            Based on a {years}-year term at {rate}% annual interest.
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
