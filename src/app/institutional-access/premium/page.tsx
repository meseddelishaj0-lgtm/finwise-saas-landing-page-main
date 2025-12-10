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
      <main className="min-h-screen bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl font-bold text-yellow-500 mb-4">
            Institutional Premium
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            For top-tier funds and enterprises requiring full-scale data automation and expert support.
          </p>

          <div className="bg-white shadow-xl rounded-2xl p-10 text-left space-y-4">
            <h2 className="text-2xl font-semibold">Included Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
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
            className="mt-10 inline-block bg-yellow-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-yellow-600 transition"
          >
            Subscribe – $499/mo
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
