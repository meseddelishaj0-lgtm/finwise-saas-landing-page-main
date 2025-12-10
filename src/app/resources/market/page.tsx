"use client";

import React, { useState } from "react";

const MarketPage = () => {
  const [activeTab, setActiveTab] = useState("beginner");

  return (
    <main className="min-h-screen py-16 px-6 md:px-20 bg-background text-foreground">
      <section className="max-w-5xl mx-auto text-center mb-12 pt-32 md:pt-40">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">📊 Market Resources</h1>
        <p className="text-lg text-foreground-accent">
          Stay informed about stock markets, indices, and global economic trends.
          Learn how to analyze market cycles, interpret data, and make data-driven investment decisions.
        </p>
      </section>

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

      {activeTab === "beginner" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">📈 Understanding the Stock Market</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>What are stocks, ETFs, and indices?</li>
              <li>How stock prices move and why</li>
              <li>Major indices: S&P 500, Nasdaq, Dow Jones</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "intermediate" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🧠 Market Analysis Techniques</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Fundamental vs Technical Analysis</li>
              <li>Economic Indicators (CPI, GDP, Yield Curve)</li>
              <li>Market Sentiment & Volume Analysis</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "advanced" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🚀 Advanced Trading & Macro Insights</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Options, Futures, and Hedging Strategies</li>
              <li>Quantitative Trading Models</li>
              <li>Monetary Policy & Global Capital Flows</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
};

export default MarketPage;
