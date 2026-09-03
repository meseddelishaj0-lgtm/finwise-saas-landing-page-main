"use client";

import React, { useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function CompoundInterestCalculatorPage() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [frequency, setFrequency] = useState("12"); // compounding per year
  const [result, setResult] = useState<{ future: number; interest: number } | null>(null);
  const [chartData, setChartData] = useState<{ year: number; balance: number }[]>([]);

  const calculateCompound = () => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(years);
    const n = parseFloat(frequency);

    if (isNaN(P) || isNaN(r) || isNaN(t) || isNaN(n) || P <= 0 || t <= 0) {
      setResult(null);
      setChartData([]);
      return;
    }

    const A = P * Math.pow(1 + r / n, n * t); // future value
    const interest = A - P;

    // Generate yearly data
    const data = Array.from({ length: Math.floor(t) + 1 }, (_, i) => {
      const balance = P * Math.pow(1 + r / n, n * i);
      return { year: i, balance: parseFloat(balance.toFixed(2)) };
    });

    setResult({ future: A, interest });
    setChartData(data);
  };

  const reset = () => {
    setPrincipal("");
    setRate("");
    setYears("");
    setFrequency("12");
    setResult(null);
    setChartData([]);
  };

  return (
    <main className="min-h-screen bg-night text-ivory flex flex-col items-center px-6 py-14 md:py-20">
      {/* Hero Section */}
      <Reveal className="text-center max-w-2xl mb-10">
        <CommandLine cmd="CAL" note="compound interest" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
          Compound interest calculator
        </h1>
        <p className="mt-5 text-lg text-gray-400 leading-relaxed">
          See how your investments grow over time through the power of compounding — 
          essential for long-term wealth planning.
        </p>
      </Reveal>

      {/* Calculator Card */}
      <div className="w-full max-w-md card-night p-8">
        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Initial Investment ($)
        </label>
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 10000"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Annual Interest Rate (%)
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 7"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Investment Duration (Years)
        </label>
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
          placeholder="e.g. 10"
        />

        <label className="mb-2 block font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          Compounding Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full border border-white/10 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
        >
          <option value="1">Annually</option>
          <option value="2">Semi-Annually</option>
          <option value="4">Quarterly</option>
          <option value="12">Monthly</option>
          <option value="365">Daily</option>
        </select>

        <div className="flex gap-3">
          <button
            onClick={calculateCompound}
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

      {/* Results */}
      {result && (
        <>
          <Reveal className="max-w-md w-full mt-10 card-night p-6 text-center">
            <h2 className="text-lg md:text-xl font-semibold text-ivory mb-2">
              Investment summary
            </h2>
            <p className="text-lg text-gray-300">
              <span className="font-semibold">Final Balance: </span>
              <span className="font-monodata tabular-nums text-gold font-semibold">
                ${result.future.toFixed(2)}
              </span>
            </p>
            <p className="text-lg text-gray-300 mt-2">
              <span className="font-semibold">Total Interest Earned: </span>
              ${result.interest.toFixed(2)}
            </p>
            <p className="text-gray-400 mt-3">
              Based on {years} years at {rate}% annual rate, compounded{" "}
              {frequency === "1"
                ? "annually"
                : frequency === "2"
                ? "semi-annually"
                : frequency === "4"
                ? "quarterly"
                : frequency === "12"
                ? "monthly"
                : "daily"}
              .
            </p>
          </Reveal>

          {/* Chart Section */}
          <Reveal className="w-full max-w-3xl mt-12 card-night p-6">
            <h3 className="text-lg md:text-xl font-semibold text-ivory mb-4 text-center">
              Growth over time
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Year", position: "insideBottomRight", offset: -5, fill: "#6B7280", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Balance ($)", angle: -90, position: "insideLeft", fill: "#6B7280", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ background: "#161410", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    itemStyle={{ color: "#F2EDE3" }}
                    labelStyle={{ color: "#6B7280" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#FACC15"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Reveal>
        </>
      )}
      <Reveal className="mt-12">
        <Link href="/resources/tools-calculator" className="btn-ghost-gold px-5 py-2.5 text-sm">
          ← Back to calculators
        </Link>
      </Reveal>
    </main>
  );
}
