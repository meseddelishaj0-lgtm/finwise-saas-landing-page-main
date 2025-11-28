"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface TaxBracket {
  rate: number;
  range: [number, number];
}

interface StateTax {
  name: string;
  rate: number;
}

export default function TaxEstimatorPage() {
  const [income, setIncome] = useState("");
  const [status, setStatus] = useState("single");
  const [state, setState] = useState("none");
  const [advanced, setAdvanced] = useState(false);
  const [deduction, setDeduction] = useState("standard");
  const [itemized, setItemized] = useState("");
  const [children, setChildren] = useState("");
  const [result, setResult] = useState<{
    federal: number;
    state: number;
    fica: number;
    total: number;
    effectiveRate: number;
    afterTax: number;
    deductionAmount: number;
    creditAmount: number;
  } | null>(null);

  // ---------- Tax Brackets ----------
  const brackets: Record<string, TaxBracket[]> = {
    single: [
      { rate: 0.1, range: [0, 11600] },
      { rate: 0.12, range: [11600, 47150] },
      { rate: 0.22, range: [47150, 100525] },
      { rate: 0.24, range: [100525, 191950] },
      { rate: 0.32, range: [191950, 243725] },
      { rate: 0.35, range: [243725, 609350] },
      { rate: 0.37, range: [609350, Infinity] },
    ],
    married: [
      { rate: 0.1, range: [0, 23200] },
      { rate: 0.12, range: [23200, 94300] },
      { rate: 0.22, range: [94300, 201050] },
      { rate: 0.24, range: [201050, 383900] },
      { rate: 0.32, range: [383900, 487450] },
      { rate: 0.35, range: [487450, 731200] },
      { rate: 0.37, range: [731200, Infinity] },
    ],
  };

  // ---------- State Tax Rates ----------
  const states: StateTax[] = [
    { name: "None (0%)", rate: 0 },
    { name: "California (9.3%)", rate: 0.093 },
    { name: "New York (6.5%)", rate: 0.065 },
    { name: "Florida (0%)", rate: 0 },
    { name: "Texas (0%)", rate: 0 },
    { name: "Ohio (3.5%)", rate: 0.035 },
    { name: "Illinois (4.95%)", rate: 0.0495 },
    { name: "Pennsylvania (3.07%)", rate: 0.0307 },
    { name: "New Jersey (5.5%)", rate: 0.055 },
  ];

  const standardDeductions = {
    single: 14600,
    married: 29200,
  };

  // ---------- Helper: Federal Tax ----------
  const calculateFederalTax = (incomeVal: number, taxableIncome: number) => {
    const userBrackets = brackets[status];
    let remaining = taxableIncome;
    let totalTax = 0;

    for (const b of userBrackets) {
      const [low, high] = b.range;
      if (taxableIncome > low) {
        const taxable = Math.min(remaining, high - low);
        const tax = taxable * b.rate;
        totalTax += tax;
        remaining -= taxable;
        if (remaining <= 0) break;
      }
    }

    return totalTax;
  };

  // ---------- Main Calculation ----------
  const calculateTax = () => {
    const incomeVal = parseFloat(income);
    const itemizedVal = parseFloat(itemized) || 0;
    const childCount = parseInt(children) || 0;

    if (isNaN(incomeVal) || incomeVal <= 0) {
      setResult(null);
      return;
    }

    // Determine deduction amount
    const deductionAmount =
      deduction === "standard"
        ? standardDeductions[status as "single" | "married"]
        : itemizedVal;

    const taxableIncome = Math.max(incomeVal - deductionAmount, 0);
    const federal = calculateFederalTax(incomeVal, taxableIncome);

    // Child tax credit
    const creditAmount = Math.min(childCount * 2000, federal);

    // Apply credit
    const netFederal = federal - creditAmount;

    // State tax
    const selectedState = states.find((s) => s.name.startsWith(state));
    const stateTax = selectedState ? incomeVal * selectedState.rate : 0;

    // FICA (SS + Medicare)
    const ssTax = Math.min(incomeVal, 168600) * 0.062;
    const medicareTax = incomeVal * 0.0145;
    const fica = ssTax + medicareTax;

    const total = netFederal + stateTax + fica;
    const afterTax = incomeVal - total;
    const effectiveRate = (total / incomeVal) * 100;

    setResult({
      federal: netFederal,
      state: stateTax,
      fica,
      total,
      effectiveRate,
      afterTax,
      deductionAmount,
      creditAmount,
    });
  };

  const reset = () => {
    setIncome("");
    setStatus("single");
    setState("none");
    setAdvanced(false);
    setDeduction("standard");
    setItemized("");
    setChildren("");
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center pt-36 md:pt-44 pb-16 px-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          🧾 Advanced Tax Estimator
        </h1>
        <p className="text-lg text-gray-600">
          Calculate your federal, state, and FICA taxes with deductions and credits
          to get a realistic picture of your net income.
        </p>
      </motion.section>

      {/* Calculator Form */}
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8">
        <label className="block text-gray-800 font-semibold mb-2">
          Annual Income ($)
        </label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="e.g. 95000"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Filing Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="single">Single</option>
          <option value="married">Married Filing Jointly</option>
        </select>

        <label className="block text-gray-800 font-semibold mb-2">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {states.map((s) => (
            <option key={s.name} value={s.name.split(" ")[0]}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Advanced Toggle */}
        <div className="flex items-center mb-4">
          <input
            id="advanced"
            type="checkbox"
            checked={advanced}
            onChange={() => setAdvanced(!advanced)}
            className="mr-2 w-5 h-5"
          />
          <label htmlFor="advanced" className="text-gray-800 font-semibold">
            Enable Advanced Mode
          </label>
        </div>

        {/* Advanced Options */}
        {advanced && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
            <div>
              <label className="block text-gray-800 font-semibold mb-2">
                Deduction Type
              </label>
              <select
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="standard">Standard Deduction</option>
                <option value="itemized">Itemized Deduction</option>
              </select>

              {deduction === "itemized" && (
                <input
                  type="number"
                  value={itemized}
                  onChange={(e) => setItemized(e.target.value)}
                  placeholder="Enter itemized deduction amount"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              )}
            </div>

            <div>
              <label className="block text-gray-800 font-semibold mb-2">
                Number of Qualifying Children
              </label>
              <input
                type="number"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                placeholder="e.g. 2"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={calculateTax}
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl w-full mt-10 bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">
            Tax Summary
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-700">Federal Tax</p>
              <p className="text-2xl text-yellow-500 font-bold">
                ${result.federal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">State Tax</p>
              <p className="text-2xl text-yellow-500 font-bold">
                ${result.state.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">FICA</p>
              <p className="text-2xl text-yellow-500 font-bold">
                ${result.fica.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Total Tax</p>
              <p className="text-3xl text-yellow-600 font-bold">
                ${result.total.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Effective Rate</p>
              <p className="text-3xl text-yellow-600 font-bold">
                {result.effectiveRate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">After-Tax Income</p>
              <p className="text-3xl text-green-600 font-bold">
                ${result.afterTax.toFixed(2)}
              </p>
            </div>
          </div>

          {advanced && (
            <div className="mt-6 border-t border-gray-200 pt-4 text-center">
              <p className="text-sm text-gray-600">
                <strong>Deductions:</strong> ${result.deductionAmount.toLocaleString()} |{" "}
                <strong>Credits:</strong> ${result.creditAmount.toLocaleString()}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6 text-center">
            *Estimates use 2024 U.S. federal, FICA, and sample state tax rates. 
            Actual results vary by deductions, credits, and local taxes.
          </p>
        </motion.div>
      )}
    </main>
  );
}
