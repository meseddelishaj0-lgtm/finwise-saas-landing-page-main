"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Search, TrendingUp } from "lucide-react";

interface IPO {
  symbol: string;
  name: string;
  date: string;
  price: string;
  exchange: string;
  status: string;
}

export default function Page() {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchIPOs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ipo");
      const data = await res.json();
      setIpos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIPOs();
  }, []);

  const filteredIPOs = ipos.filter(
    (ipo) =>
      ipo.name.toLowerCase().includes(query.toLowerCase()) ||
      ipo.symbol.toLowerCase().includes(query.toLowerCase())
  );

  const handleAIAnalyze = async () => {
    if (!aiInput) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Provide a professional IPO analysis for ${aiInput}. 
          Include valuation overview, investor sentiment, and risk factors.`,
        }),
      });
      const data = await res.json();
      setAiResponse(data.result || "No analysis available.");
    } catch (err) {
      setAiResponse("Error fetching AI insights.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          IPO Tracker
        </h1>
        <p className="text-lg text-gray-600">
          Explore recent and upcoming IPOs with live market data and AI-powered
          analysis — only on WallStreetStocks.ai.
        </p>
      </motion.section>

      {/* Search + Refresh */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
          <Search className="ml-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search IPO by company or symbol..."
            className="px-3 py-2 outline-none w-64 md:w-80"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          onClick={fetchIPOs}
          disabled={loading}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all"
        >
          <RefreshCcw className="w-5 h-5" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* IPO Table */}
      <div className="overflow-x-auto w-full max-w-6xl border border-gray-200 rounded-2xl shadow-md bg-gray-50 mb-14">
        <table className="min-w-full text-left text-sm md:text-base">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 font-semibold text-gray-800">Company</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Symbol</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Exchange</th>
              <th className="py-3 px-4 font-semibold text-gray-800">IPO Date</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Price</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredIPOs.length > 0 ? (
              filteredIPOs.map((ipo, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-200 hover:bg-white transition-all"
                >
                  <td className="py-3 px-4">{ipo.name}</td>
                  <td className="py-3 px-4 font-medium text-yellow-600">
                    {ipo.symbol}
                  </td>
                  <td className="py-3 px-4">{ipo.exchange}</td>
                  <td className="py-3 px-4">{ipo.date}</td>
                  <td className="py-3 px-4">${ipo.price}</td>
                  <td
                    className={`py-3 px-4 font-medium ${
                      ipo.status === "upcoming"
                        ? "text-blue-600"
                        : ipo.status === "priced"
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-gray-500 italic"
                >
                  No IPO data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI Analysis Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl w-full bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="text-yellow-500 w-7 h-7" />
          <h2 className="text-2xl font-semibold text-gray-900">
            AI IPO Analysis
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          Enter a company name or IPO symbol to get instant AI insights —
          valuation breakdown, investor sentiment, and post-listing forecasts.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="e.g. Arm Holdings, Rivian, or ABNB"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={handleAIAnalyze}
            disabled={aiLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
          >
            {aiLoading ? "Analyzing..." : "Analyze IPO"}
          </button>
        </div>

        {aiResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-4 bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              AI Insights
            </h3>
            <p className="text-gray-700 whitespace-pre-line">{aiResponse}</p>
          </motion.div>
        )}
      </motion.div>

      {/* CTA */}
      <div className="text-center mt-16">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Explore More Market Intelligence
        </h3>
        <p className="text-gray-600 mb-6">
          Access detailed IPO filings, institutional participation, and 
          predictive analytics with WallStreetStocks.ai Premium.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Unlock Full Access
        </a>
      </div>
    </main>
  );
}
