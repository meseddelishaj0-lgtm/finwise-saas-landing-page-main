import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Institutional Basic | WallStreetStocks",
  description:
    "Access AI dashboards, ETF data, and stock market insights with the Institutional Basic plan from WallStreetStocks.",
};

export default function InstitutionalBasicPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-night py-14">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl text-gold mb-4 font-display font-normal tracking-tight md:text-5xl">
            Institutional Basic
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Perfect for firms seeking essential market intelligence and AI-driven insights.
          </p>

          <div className="bg-surface shadow-xl rounded-2xl p-10 text-left space-y-4">
            <h2 className="text-2xl font-semibold">Included Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>AI dashboards & analytics</li>
              <li>ETF & Equity Data Access</li>
              <li>Stock Market Insights</li>
              <li>Custom Research Reports</li>
              <li>Fundamental Analysis Tools</li>
              <li>Email Support</li>
            </ul>
          </div>

          <a
            href="/institutional-access/basic"
            className="mt-10 inline-block bg-gold text-night px-8 py-3 rounded-full font-semibold hover:bg-gold-deep transition"
          >
            Subscribe – $199/mo
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
