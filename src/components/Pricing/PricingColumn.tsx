"use client";

import React, { useState } from "react";
import { CheckCircle } from "lucide-react";
import { IPricing } from "@/types";

interface PricingColumnProps {
  tier: IPricing;
  highlight?: boolean;
}

const PricingColumn: React.FC<PricingColumnProps> = ({ tier, highlight }) => {
  const [loading, setLoading] = useState(false);

  // 🔹 Stripe Checkout Handler
  const handleCheckout = async () => {
    if (!tier.stripePriceId) {
      alert("Stripe price ID not set for this plan.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: tier.stripePriceId, // ✅ Stripe price for this plan
          plan: tier.name, // ✅ Gold / Platinum / Diamond
          email: "testuser@example.com", // ⚙️ replace with real user email later
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // ✅ Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert("⚠️ Checkout failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("❌ Checkout error:", err);
      alert("Something went wrong during checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative border rounded-2xl p-8 shadow-sm transition-all duration-300 transform
      ${
        highlight
          ? "bg-gradient-to-b from-yellow-50 to-white border-yellow-400 shadow-lg scale-105"
          : "bg-white border-gray-200 hover:shadow-md"
      }`}
    >
      {/* ✅ “Most Popular” badge for Platinum */}
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-semibold px-3 py-1 rounded-full shadow-md">
          💎 Most Popular
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-2xl font-semibold mb-2 text-gray-900 text-center">
        {tier.name}
      </h3>

      {/* Price */}
      <p className="text-4xl font-bold text-blue-600 mb-6 text-center">
        ${tier.price}
        <span className="text-gray-500 text-base">/mo</span>
      </p>

      {/* Feature Description */}
      <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
        Features
      </h4>
      <p className="text-gray-600 mb-4">
        {tier.name === "Gold"
          ? "Perfect for beginners starting their AI investing journey."
          : tier.name === "Platinum"
          ? "Everything included in Gold, plus advanced AI tools and dashboards."
          : tier.name === "Diamond"
          ? "Everything included in Platinum, plus full research access and priority insights."
          : "Everything from the previous plan, plus more..."}
      </p>

      {/* Features list */}
      <ul className="space-y-2">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button (Stripe Checkout) */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`mt-8 w-full py-3 font-semibold rounded-full transition-all
          ${
            highlight
              ? "bg-yellow-400 hover:bg-yellow-500 text-black shadow-md"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "Processing..." : "Subscribe"}
      </button>
    </div>
  );
};

export default PricingColumn;
