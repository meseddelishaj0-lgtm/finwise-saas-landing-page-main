"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

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
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center pt-36 md:pt-44 pb-16 px-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          🏠 Mortgage Calculator
        </h1>
        <p className="text-lg text-gray-600">
          Calculate your estimated monthly mortgage payment — including principal and interest — to plan your next property purchase.
        </p>
      </motion.section>

      {/* Calculator Card */}
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8">
        <label className="block text-gray-800 font-semibold mb-2">
          Loan Amount ($)
        </label>
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 350000"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Annual Interest Rate (%)
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 6.5"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Loan Term (Years)
        </label>
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 30"
        />

        <div className="flex gap-3">
          <button
            onClick={calculateMortgage}
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

      {/* Result Display */}
      {monthlyPayment !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mt-10 bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h2 className="text-xl font-bold mb-2 text-gray-800">Monthly Payment</h2>
          <p className="text-3xl font-extrabold text-yellow-500">
            ${monthlyPayment.toFixed(2)}
          </p>
          <p className="text-gray-600 mt-2">
            Based on a {years}-year term at {rate}% annual interest.
          </p>
        </motion.div>
      )}
    </main>
  );
}
