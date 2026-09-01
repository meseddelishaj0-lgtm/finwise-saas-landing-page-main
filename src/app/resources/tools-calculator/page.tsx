"use client";

import React from "react";
import Link from "next/link";
import { Calculator, TrendingUp, Home, DollarSign, BarChart3, PiggyBank } from "lucide-react";

export default function ToolsCalculatorsPage() {
  const tools = [
    {
      title: "ROI Calculator",
      icon: <TrendingUp className="w-6 h-6 text-gold" />,
      description:
        "Quickly calculate Return on Investment (ROI) to measure profitability and make smarter investment decisions.",
      href: "/resources/tools-calculator/roi-calculator",
    },
    {
      title: "Mortgage Calculator",
      icon: <Home className="w-6 h-6 text-gold" />,
      description:
        "Estimate monthly mortgage payments, total interest, and loan amortization to plan your next property purchase.",
      href: "/resources/tools-calculator/mortgage-calculator",
    },
    {
      title: "Loan Calculator",
      icon: <DollarSign className="w-6 h-6 text-gold" />,
      description:
        "Understand your loan payments, interest breakdown, and total cost across different time periods.",
      href: "/resources/tools-calculator/loan-calculator",
    },
    {
      title: "Compound Interest Calculator",
      icon: <PiggyBank className="w-6 h-6 text-gold" />,
      description:
        "See how your investments grow over time through the power of compounding — essential for long-term wealth planning.",
      href: "/resources/tools-calculator/compound-interest",
    },
    {
      title: "Tax Estimator",
      icon: <BarChart3 className="w-6 h-6 text-gold" />,
      description:
        "Estimate income tax liabilities and effective tax rates based on your income level and filing status.",
      href: "/resources/tools-calculator/tax-estimator",
    },
  ];

  return (
    <section className="min-h-screen bg-night px-6 pt-10 md:pt-12 pb-20">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl mb-6 text-ivory font-display font-normal tracking-tight md:text-5xl">
          Tools & Calculators
        </h1>
        <p className="text-lg text-gray-400 mb-12">
          Access smart, data-driven tools built to simplify financial planning,
          analyze returns, and guide confident investment decisions.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="p-6 rounded-2xl border shadow-sm hover:shadow-md transition bg-surface2 hover:bg-surface2 block"
            >
              <div className="flex items-center mb-3 space-x-3">
                {tool.icon}
                <h3 className="text-xl font-semibold text-ivory">{tool.title}</h3>
              </div>
              <p className="text-gray-400">{tool.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">Coming Soon</h2>
          <p className="text-gray-400">
            AI-powered valuation models, real estate affordability tools, and advanced
            market analyzers are in development.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/resources"
            className="inline-block mt-8 text-gold hover:text-indigo-800 font-semibold transition"
          >
            ← Back to Resources
          </Link>
        </div>
      </div>
    </section>
  );
}
