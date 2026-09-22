"use client";

import React, { useEffect, useRef, useState } from "react";
import { IPricing } from "@/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export type Billing = "monthly" | "yearly";

const APP_STORE_URL = "https://apps.apple.com/us/app/wall-street-stocks/id6756940110";

interface PricingColumnProps {
  tier: IPricing;
  billing?: Billing;
  highlight?: boolean;
  /** Set when the user picked this plan, signed in, and came back — resume checkout. */
  autoCheckout?: boolean;
}

const TAGLINES: Record<string, string> = {
  Gold: "The essentials for your first serious positions.",
  Platinum: "Everything in Gold, plus pro screeners and unlimited watchlists.",
  Diamond: "Everything in Platinum, plus the full AI toolkit.",
};

const PricingColumn: React.FC<PricingColumnProps> = ({ tier, billing = "monthly", highlight, autoCheckout }) => {
  const yearly = billing === "yearly" && tier.yearlyPrice != null;
  const priceId = yearly ? tier.stripeYearlyPriceId : tier.stripePriceId;
  // Yearly plans are sold in the iOS app until a yearly Stripe price exists —
  // never fall back to the monthly price ID while the card shows a yearly price.
  const yearlyInAppOnly = yearly && !priceId;
  const perMonth = yearly ? (Number(tier.yearlyPrice) / 12).toFixed(2) : null;

  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Stripe Checkout — requires a signed-in user
  const handleCheckout = async () => {
    if (!session) {
      const back = `/plans?checkout=${encodeURIComponent(tier.name.toLowerCase())}`;
      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }

    if (!priceId) {
      alert("Stripe price ID not set for this plan.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
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

  const resumed = useRef(false);
  useEffect(() => {
    if (!autoCheckout || resumed.current || status !== "authenticated") return;
    resumed.current = true;
    handleCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout, status]);

  return (
    <div
      className={`relative h-full flex flex-col p-8 rounded-2xl border transition-colors duration-300 ${
        highlight
          ? "border-gold/60 bg-surface2 shadow-[0_40px_80px_-50px_rgba(250,204,21,0.35)]"
          : "border-white/10 bg-surface hover:border-white/20"
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
          ${yearly ? tier.yearlyPrice : tier.price}
        </span>
        <span className="font-monodata text-xs uppercase tracking-wider text-gray-500">
          / {yearly ? "year" : "month"}
        </span>
      </p>
      <p className="mt-1 font-monodata text-[11px] uppercase tracking-wider text-gray-500">
        {yearly ? (
          <>
            <span className="text-gray-300 tabular-nums">${perMonth}</span> / month, billed yearly
          </>
        ) : (
          "Billed monthly · cancel anytime"
        )}
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

      {yearlyInAppOnly ? (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-10 w-full text-center ${highlight ? "btn-gold" : "btn-ghost-gold"}`}
        >
          Get {tier.name} yearly in the app
        </a>
      ) : (
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`mt-10 w-full ${highlight ? "btn-gold" : "btn-ghost-gold"} ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Processing…" : `Start ${tier.name}`}
      </button>
      )}

      {yearlyInAppOnly ? (
        <p className="mt-3 text-center font-monodata text-[11px] uppercase tracking-wider text-gray-500">
          Yearly billing via the iOS app
        </p>
      ) : !session && (
        <p className="mt-3 text-center font-monodata text-[11px] uppercase tracking-wider text-gray-500">
          Sign in to subscribe
        </p>
      )}
    </div>
  );
};

export default PricingColumn;
