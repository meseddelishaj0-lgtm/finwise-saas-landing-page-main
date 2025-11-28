"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center pt-36 md:pt-44 pb-16 px-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          🐷 Compound Interest Calculator
        </h1>
        <p className="text-lg text-gray-600">
          See how your investments grow over time through the power of compounding — 
          essential for long-term wealth planning.
        </p>
      </motion.section>

      {/* Calculator Card */}
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8">
        <label className="block text-gray-800 font-semibold mb-2">
          Initial Investment ($)
        </label>
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 10000"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Annual Interest Rate (%)
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 7"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Investment Duration (Years)
        </label>
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 10"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Compounding Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded-xl transition-all"
          >
            Calculate
          </button>
          <button
            onClick={reset}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-xl transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full mt-10 bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
          >
            <h2 className="text-xl font-bold mb-2 text-gray-800">
              Investment Summary
            </h2>
            <p className="text-lg text-gray-700">
              <span className="font-semibold">Final Balance: </span>
              <span className="text-yellow-500 font-bold">
                ${result.future.toFixed(2)}
              </span>
            </p>
            <p className="text-lg text-gray-700 mt-2">
              <span className="font-semibold">Total Interest Earned: </span>
              ${result.interest.toFixed(2)}
            </p>
            <p className="text-gray-600 mt-3">
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
          </motion.div>

          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-3xl mt-12 bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Growth Over Time
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: "Year", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "Balance ($)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
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
          </motion.div>
        </>
      )}
    </main>
  );
}
