"use client";

import React, { useEffect, useState } from "react";
import PricingColumn, { Billing } from "./PricingColumn";
import Reveal from "@/components/ui/Reveal";

import { tiers } from "@/data/pricing";

const Pricing: React.FC = () => {
  const [billing, setBilling] = useState<Billing>("monthly");
  // ?checkout=<plan> — set by the sign-in round trip so the chosen plan
  // resumes straight into checkout instead of starting over.
  const [resume, setResume] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const plan = url.searchParams.get("checkout");
    if (!plan) return;
    setResume(plan);
    url.searchParams.delete("checkout");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Billing period"
        className="mt-10 inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-surface"
      >
        {(["monthly", "yearly"] as const).map((b) => (
          <button
            key={b}
            role="radio"
            aria-checked={billing === b}
            onClick={() => setBilling(b)}
            className={`min-h-[44px] px-5 rounded-full font-monodata text-xs font-semibold uppercase tracking-wider transition-colors ${
              billing === b ? "bg-gold text-night" : "text-gray-400 hover:text-ivory"
            }`}
          >
            {b === "monthly" ? "Monthly" : "Yearly"}
            {b === "yearly" && (
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${
                  billing === b ? "bg-night/15 text-night" : "bg-green-400/10 text-green-400"
                }`}
              >
                Save 33%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier, index) => (
          <Reveal key={tier.name} delay={index * 0.1} className="h-full">
            <PricingColumn
              tier={tier}
              billing={billing}
              highlight={tier.name === "Diamond"}
              autoCheckout={resume === tier.name.toLowerCase()}
            />
          </Reveal>
        ))}
      </div>
    </>
  );
};

export default Pricing;
