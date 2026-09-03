"use client";

import React, { useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function LoanCalculatorPage() {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<{ monthly: number; total: number; interest: number } | null>(null);

  const calculateLoan = () => {
    const P = parseFloat(amount);
    const annualRate = parseFloat(rate);
    const Y = parseFloat(years);

    if (isNaN(P) || isNaN(annualRate) || isNaN(Y) || P <= 0 || Y <= 0) {
      setResult(null);
      return;
    }

    const r = annualRate / 100 / 12; // monthly interest rate
    const n = Y * 12; // total months

    // monthly payment formula
    const monthly =
      r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const total = monthly * n;
    const interest = total - P;

    setResult({ monthly, total, interest });
  };

  const reset = () => {
    setAmount("");
    setRate("");
    setYears("");
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-night text-ivory flex flex-col items-center px-6 py-14 md:py-20">
      {/* Header */}
      <Reveal className="text-center max-w-2xl mb-10">
        <CommandLine cmd="CAL" note="loan payments" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
          Loan calculator
        </h1>
        <p className="mt-5 text-lg text-gray-400 leading-relaxed">
          Understand your loan payments, interest breakdown, and total cost
          across different time periods.
        </p>
      </Reveal>

      {/* Calculator Card */}
      <div className="w-full max-w-md card-night p-8">
        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Loan Amount ($)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 25000"
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
          placeholder="e.g. 5"
        />

        <div className="flex gap-3">
          <button
            onClick={calculateLoan}
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

      {/* Result Section */}
      {result && (
        <Reveal className="max-w-md w-full mt-10 card-night p-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-ivory mb-2">Loan summary</h2>
          <div className="space-y-2">
            <p className="text-lg">
              <span className="font-semibold text-gray-300">Monthly Payment: </span>
              <span className="font-monodata tabular-nums text-gold font-semibold">
                ${result.monthly.toFixed(2)}
              </span>
            </p>
            <p className="text-lg">
              <span className="font-semibold text-gray-300">Total Payment: </span>
              ${result.total.toFixed(2)}
            </p>
            <p className="text-lg">
              <span className="font-semibold text-gray-300">Total Interest: </span>
              ${result.interest.toFixed(2)}
            </p>
          </div>
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
