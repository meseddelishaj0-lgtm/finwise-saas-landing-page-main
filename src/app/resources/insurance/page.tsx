"use client";

import React, { useState } from "react";
import Link from "next/link";

const InsurancePage = () => {
  const [activeTab, setActiveTab] = useState("beginner");

  return (
    <main className="min-h-screen py-16 px-6 md:px-20 bg-background text-foreground">
      {/* Header */}
      <section className="max-w-5xl mx-auto text-center mb-12 pt-32 md:pt-40">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex justify-center items-center gap-2">
          🛡️ Insurance Resources
        </h1>
        <p className="text-lg text-foreground-accent">
          Understand how insurance protects wealth, manages risk, and plays a central role in personal and business finance.
          Learn about life, health, property, and liability insurance — from fundamentals to advanced strategies.
        </p>
      </section>

      {/* Tabs */}
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

      {/* BEGINNER */}
      {activeTab === "beginner" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🏥 What Is Insurance?</h2>
            <p className="text-foreground-accent mb-3">
              Insurance is a contract that transfers financial risk from an individual or business to an insurer.
            </p>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Life, Health, Property, and Liability insurance</li>
              <li>Premiums, Deductibles, and Coverage Limits</li>
              <li>Purpose: Risk management and asset protection</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">💡 Why Insurance Matters</h2>
            <p className="text-foreground-accent">
              Insurance provides financial security and ensures continuity in case of unforeseen events — essential for financial planning.
            </p>
          </div>
        </section>
      )}

      {/* INTERMEDIATE */}
      {activeTab === "intermediate" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🏠 Property & Casualty Insurance</h2>
            <p className="text-foreground-accent mb-3">
              Covers losses from damage or liability — such as car, homeowners, or business insurance.
            </p>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Homeowners & Auto Coverage</li>
              <li>Business Interruption Insurance</li>
              <li>Professional Liability (E&O)</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">💰 Life & Health Insurance</h2>
            <p className="text-foreground-accent">
              Learn about term vs. whole life insurance, health plan structures (HMO/PPO), and employer-provided benefits.
            </p>
          </div>
        </section>
      )}

      {/* ADVANCED */}
      {activeTab === "advanced" && (
        <section className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">📈 Advanced Insurance Strategies</h2>
            <ul className="list-disc list-inside text-foreground-accent">
              <li>Key Person Insurance for Businesses</li>
              <li>Captive Insurance Companies</li>
              <li>Using Insurance in Estate Planning</li>
            </ul>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-2">🧠 Insurance in Wealth Management</h2>
            <p className="text-foreground-accent">
              Explore how high-net-worth individuals use permanent life insurance for tax-advantaged growth and wealth transfer.
            </p>
          </div>
        </section>
      )}
    </main>
  );
};

export default InsurancePage;
