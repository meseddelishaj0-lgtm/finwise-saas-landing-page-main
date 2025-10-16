"use client";

import React, { useState } from "react";

const TaxesPage = () => {
  const [activeTab, setActiveTab] = useState("beginner");

  return (
    <main className="min-h-screen py-16 px-6 md:px-20 bg-background text-foreground">
      <section className="max-w-5xl mx-auto text-center mb-12 pt-32 md:pt-40">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">💵 Tax Resources</h1>
        <p className="text-lg text-foreground-accent">
          Learn how taxation impacts income, investments, and businesses.
          Understand how to minimize tax liability legally through effective planning.
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
            <h2 className="text-2xl font-semibold mb-2">📘 Introduction to Taxes</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Income vs Payroll vs Capital Gains Taxes</li>
              <li>Filing Status and Tax Brackets</li>
              <li>How withholdings and deductions work</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "intermediate" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🏢 Business and Self-Employment Taxes</h2>
            <p className="text-foreground-accent mb-3">
              Understand tax obligations for freelancers, LLCs, and corporations.
            </p>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Schedule C, 1099, and Self-Employment Tax</li>
              <li>Corporate vs Pass-Through Entities</li>
              <li>Estimated Quarterly Payments</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === "advanced" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">📈 Tax Planning Strategies</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Tax-Loss Harvesting for Investors</li>
              <li>Deferred Income & 1031 Exchanges</li>
              <li>Retirement Account Optimization (IRA, 401k, Roth)</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
};

export default TaxesPage;
