import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Institutional Premium | WallStreetStocks",
  description:
    "Experience elite portfolio optimization, unlimited data access, and 24/7 priority support.",
};

export default function InstitutionalPremiumPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-night py-14">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl text-gold mb-4 font-display font-normal tracking-tight md:text-5xl">
            Institutional Premium
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            For top-tier funds and enterprises requiring full-scale data automation and expert support.
          </p>

          <div className="bg-surface shadow-xl rounded-2xl p-10 text-left space-y-4">
            <h2 className="text-2xl font-semibold">Included Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Unlimited Data Access</li>
              <li>Research Automation Tools</li>
              <li>24/7 Priority Support</li>
              <li>Expert Valuation Models</li>
              <li>Portfolio Optimization</li>
              <li>Top 10 Stock Picks Monthly</li>
            </ul>
          </div>

          <a
            href="/institutional-access/premium"
            className="mt-10 inline-block bg-gold text-night px-8 py-3 rounded-full font-semibold hover:bg-gold-deep transition"
          >
            Subscribe – $499/mo
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
