import React from "react";
import Pricing from "@/components/Pricing/Pricing";
import type { Metadata } from "next";
import PlansHeader from "@/components/PlansHeader"; // <-- we'll make this small client file below

// ✅ Add a proper metadataBase to remove the warning
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
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "WallStreetStocks.ai Plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WallStreetStocks.ai Plans",
    description:
      "Choose your AI-powered investment plan — Gold, Platinum, or Diamond.",
    images: ["/images/twitter-image.jpg"],
  },
};

const PlansPage = () => {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-24">
        {/* ✅ Header animation moved to client component */}
        <PlansHeader />

        <Pricing />
      </div>
    </main>
  );
};

export default PlansPage;
