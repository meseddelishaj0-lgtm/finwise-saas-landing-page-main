"use client";

import React, { useState } from "react";
import { IPricing } from "@/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PricingColumnProps {
  tier: IPricing;
  highlight?: boolean;
}

const TAGLINES: Record<string, string> = {
  Gold: "The essentials for your first serious positions.",
  Platinum: "Everything in Gold, plus the live dashboards.",
  Diamond: "Everything in Platinum, plus full research access.",
};

const PricingColumn: React.FC<PricingColumnProps> = ({ tier, highlight }) => {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Stripe Checkout — requires a signed-in user
  const handleCheckout = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

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
          priceId: tier.stripePriceId,
          plan: tier.name,
          email: session?.user?.email || "unknown@example.com",
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert("Checkout failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert("Something went wrong during checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative h-full flex flex-col p-8 rounded-xl border bg-surface ${
        highlight ? "border-yellow-400/60" : "border-white/10"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-8 font-monodata text-[10px] font-semibold uppercase tracking-widest bg-gold text-night px-3 py-1 rounded">
          Most popular
        </span>
      )}

      <span className="font-monodata text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        {tier.name}
      </span>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl text-ivory tabular-nums">
          ${tier.price}
        </span>
        <span className="font-monodata text-xs uppercase tracking-wider text-gray-500">
          / month
        </span>
      </p>

      <p className="mt-3 text-sm text-gray-400">
        {TAGLINES[tier.name] ?? "Everything from the previous plan, plus more."}
      </p>

      <ul className="mt-8 space-y-3.5 text-left text-gray-300 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 font-monodata text-gold font-semibold select-none">
              +
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`mt-10 w-full ${highlight ? "btn-gold" : "btn-ghost-gold"} ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Processing…" : `Start ${tier.name}`}
      </button>

      {!session && (
        <p className="mt-3 text-center font-monodata text-[11px] uppercase tracking-wider text-gray-500">
          Sign in to subscribe
        </p>
      )}
    </div>
  );
};

export default PricingColumn;
