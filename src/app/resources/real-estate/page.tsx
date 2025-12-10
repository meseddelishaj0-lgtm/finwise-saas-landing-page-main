"use client";

import React, { useState } from "react";
import Link from "next/link";

const RealEstatePage = () => {
  const [activeTab, setActiveTab] = useState("beginner");

  return (
    <main className="min-h-screen py-16 px-6 md:px-20 bg-background text-foreground">
      {/* Header Section */}
      <section className="max-w-5xl mx-auto text-center mb-12 pt-32 md:pt-40">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex justify-center items-center gap-2">
          🏠 Real Estate Resources
        </h1>
        <p className="text-lg text-foreground-accent">
          Master the fundamentals of property investing, valuation, and financing.
          Explore guides that cover residential, commercial, and investment real estate —
          perfect for future agents, investors, and analysts.
        </p>
      </section>

      {/* Tabs Navigation */}
      <div className="flex justify-center gap-4 mb-10">
        {["beginner", "intermediate", "advanced"].map((level) => (
          <button
            key={level}
            onClick={() => setActiveTab(level)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              activeTab === level
                ? "bg-primary text-white shadow-lg"
                : "bg-card text-foreground hover:bg-primary/10"
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Tabs */}
      <section className="max-w-5xl mx-auto space-y-10">
        {/* BEGINNER TAB */}
        {activeTab === "beginner" && (
          <div className="space-y-10 animate-fadeIn">
            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                🏡 Introduction to Real Estate
              </h2>
              <p className="text-foreground-accent mb-3">
                Get familiar with the basics of real estate: how properties are bought, sold,
                and valued. Understand the key players and what drives the market.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Types of Real Estate (Residential, Commercial, Industrial, Land)</li>
                <li>How property values are determined</li>
                <li>Role of agents, brokers, and appraisers</li>
              </ul>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                💰 Real Estate as an Investment
              </h2>
              <p className="text-foreground-accent mb-3">
                Learn how real estate generates wealth through appreciation, rental income,
                and tax advantages.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Cash Flow and Appreciation</li>
                <li>Active vs Passive Investing</li>
                <li>REITs and Real Estate Funds</li>
              </ul>
            </div>
          </div>
        )}

        {/* INTERMEDIATE TAB */}
        {activeTab === "intermediate" && (
          <div className="space-y-10 animate-fadeIn">
            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                📊 Real Estate Finance & Valuation
              </h2>
              <p className="text-foreground-accent mb-3">
                Dive deeper into valuation and financial analysis methods that investors use
                to determine property worth.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Net Operating Income (NOI) and Cap Rate</li>
                <li>Discounted Cash Flow (DCF) Valuation</li>
                <li>Gross Rent Multiplier (GRM) and Sales Comparison Approach</li>
              </ul>
              <Link href="#" className="text-primary mt-3 inline-block hover:underline">
                → Try an Interactive Cap Rate Calculator
              </Link>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                🧾 Real Estate Contracts & Law
              </h2>
              <p className="text-foreground-accent mb-3">
                Understand the legal framework of real estate transactions — from purchase
                agreements to deeds and title insurance.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Listing and Purchase Agreements</li>
                <li>Deeds, Liens, and Easements</li>
                <li>Title Reports and Escrow</li>
              </ul>
            </div>
          </div>
        )}

        {/* ADVANCED TAB */}
        {activeTab === "advanced" && (
          <div className="space-y-10 animate-fadeIn">
            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                🏗️ Commercial Real Estate Analysis
              </h2>
              <p className="text-foreground-accent mb-3">
                Explore the advanced metrics and deal structures used in commercial real estate
                — from development projects to portfolio investing.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Loan-to-Value (LTV) & Debt Service Coverage Ratio (DSCR)</li>
                <li>IRR & Equity Multiple Calculations</li>
                <li>Lease Analysis & Tenant Risk</li>
              </ul>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                🧠 Real Estate Market Analysis
              </h2>
              <p className="text-foreground-accent mb-3">
                Learn how to evaluate neighborhoods, demand cycles, and economic indicators
                that influence real estate prices.
              </p>
              <ul className="list-disc list-inside text-foreground-accent">
                <li>Absorption Rates and Vacancy Trends</li>
                <li>Comparative Market Analysis (CMA)</li>
                <li>Regional Economic Drivers and Population Growth</li>
              </ul>
              <Link href="#" className="text-primary mt-3 inline-block hover:underline">
                → See Example Market Reports
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Learning Resources */}
      <section className="max-w-5xl mx-auto mt-16 text-center">
        <h2 className="text-3xl font-semibold mb-4">📚 Continue Learning</h2>
        <p className="text-foreground-accent mb-6">
          Expand your knowledge with these top-rated books and real estate investment courses:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h3 className="font-semibold text-xl mb-2">🏡 Recommended Books</h3>
            <ul className="text-foreground-accent list-disc list-inside">
              <li>Rich Dad Poor Dad by Robert Kiyosaki</li>
              <li>The Millionaire Real Estate Investor by Gary Keller</li>
              <li>Real Estate Finance & Investments by Brueggeman & Fisher</li>
            </ul>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h3 className="font-semibold text-xl mb-2">🎓 Online Courses</h3>
            <ul className="text-foreground-accent list-disc list-inside">
              <li>Coursera: Real Estate Investment and Development</li>
              <li>edX: Commercial Real Estate Analysis (MITx)</li>
              <li>Udemy: Real Estate Financial Modeling Bootcamp</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RealEstatePage;
