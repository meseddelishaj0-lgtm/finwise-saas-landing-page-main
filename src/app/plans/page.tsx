import React from "react";
import Pricing from "@/components/Pricing/Pricing";
import type { Metadata } from "next";
import PlansHeader from "@/components/PlansHeader";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wallstreetstocks.ai"),
  title: "WallStreetStocks.ai Plans | AI-Powered Investment Tiers",
  description:
    "Compare all WallStreetStocks.ai subscription plans — from Gold to Diamond. Get AI stock picks, research reports, portfolio tools, and advanced analytics tailored to your goals.",
  openGraph: {
    title: "WallStreetStocks.ai Plans",
    description:
      "Explore AI-powered investment tiers with live dashboards, predictive analytics, and institutional-grade research tools.",
    url: "https://www.wallstreetstocks.ai/plans",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WallStreetStocks.ai Plans",
    description:
      "Choose your AI-powered investment plan — Gold, Platinum, or Diamond.",
  },
};

const FINE_PRINT = [
  ["01", "Month to month", "No contracts. Upgrade, downgrade, or cancel any time from your account."],
  ["02", "Secure checkout", "Payments run through Stripe. We never see or store your card details."],
  ["03", "Web + iOS", "Every plan follows you across the web terminal and the iOS app."],
];

const PlansPage = () => {
  return (
    <main className="min-h-screen bg-night text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <PlansHeader />
        <Pricing />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden">
          {FINE_PRINT.map(([idx, title, body]) => (
            <div key={idx} className="bg-night p-6">
              <span className="font-monodata text-[11px] text-gold">{idx}</span>
              <p className="mt-2 font-semibold text-ivory">{title}</p>
              <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default PlansPage;
