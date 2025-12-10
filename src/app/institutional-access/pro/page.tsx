import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Institutional Pro | WallStreetStocks",
  description:
    "Unlock advanced quant models, API access, and real-time data with the Institutional Pro plan.",
};

export default function InstitutionalProPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl font-bold text-yellow-500 mb-4">
            Institutional Pro
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Designed for quant teams and research institutions demanding deeper, real-time insights.
          </p>

          <div className="bg-white shadow-xl rounded-2xl p-10 text-left space-y-4">
            <h2 className="text-2xl font-semibold">Included Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Custom Quant Models</li>
              <li>Private API Access</li>
              <li>Dedicated Account Manager</li>
              <li>Real-time Data Feeds</li>
              <li>Advanced Research Tools</li>
              <li>Valuation Frameworks</li>
            </ul>
          </div>

          <a
            href="/institutional-access/pro"
            className="mt-10 inline-block bg-yellow-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-yellow-600 transition"
          >
            Subscribe – $299/mo
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
