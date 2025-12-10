"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Brain, Search } from "lucide-react";

interface Crypto {
  symbol: string;
  name: string;
  price: string;
  changes24h: string;
  marketCap: string;
  volume: string;
}

export default function CryptoPage() {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ✅ Fetch crypto data from our unified API route
  const fetchCryptos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crypto");
      const data = await res.json();
      if (Array.isArray(data)) setCryptos(data);
      else console.error("Invalid crypto response:", data);
    } catch (err) {
      console.error("Crypto fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptos();
  }, []);

  // ✅ AI Insights
  const handleAIAnalyze = async () => {
    if (!aiInput) return;
    setAiLoading(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiInput }),
      });
      const data = await res.json();
      setAiResponse(data.result || "No analysis found.");
    } catch (err) {
      console.error(err);
      setAiResponse("Error fetching AI insights.");
    } finally {
      setAiLoading(false);
    }
  };

  // ✅ Filtered results
  const filteredCryptos = cryptos.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.symbol.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* ===== Hero Section ===== */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Cryptocurrency Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Live crypto prices, market caps, and AI-powered insights — all from
          WallStreetStocks.ai.
        </p>
      </motion.section>

      {/* ===== Search + Refresh ===== */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
          <Search className="ml-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search crypto by name or symbol..."
            className="px-3 py-2 outline-none w-72 md:w-96"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          onClick={fetchCryptos}
          disabled={loading}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all"
        >
          <RefreshCcw className="w-5 h-5" />
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* ===== Crypto Table ===== */}
      <div className="overflow-x-auto w-full max-w-6xl border border-gray-200 rounded-2xl shadow-md bg-gray-50 mb-14">
        <table className="min-w-full text-left text-sm md:text-base">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 font-semibold text-gray-800">Name</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Symbol</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Price</th>
              <th className="py-3 px-4 font-semibold text-gray-800">24h %</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Market Cap</th>
              <th className="py-3 px-4 font-semibold text-gray-800">Volume (24h)</th>
            </tr>
          </thead>
          <tbody>
            {filteredCryptos.length > 0 ? (
              filteredCryptos.map((c, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-200 hover:bg-white transition-all"
                >
                  <td className="py-3 px-4">{c.name}</td>
                  <td className="py-3 px-4 font-medium text-yellow-600">
                    {c.symbol}
                  </td>
                  <td className="py-3 px-4">${c.price}</td>
                  <td
                    className={`py-3 px-4 font-semibold ${
                      parseFloat(c.changes24h) >= 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {c.changes24h}%
                  </td>
                  <td className="py-3 px-4">${c.marketCap}</td>
                  <td className="py-3 px-4">${c.volume}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-gray-500 italic"
                >
                  No crypto data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== AI Crypto Insights ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl w-full bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-yellow-500 w-7 h-7" />
          <h2 className="text-2xl font-semibold text-gray-900">
            AI Crypto Insights
          </h2>
        </div>

        <p className="text-gray-700 mb-6">
          Enter a cryptocurrency name or symbol for an AI-powered investment
          summary and sentiment report.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="e.g. Bitcoin, Ethereum, Solana"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={handleAIAnalyze}
            disabled={aiLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
          >
            {aiLoading ? "Analyzing..." : "Analyze Crypto"}
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

      {/* ===== CTA ===== */}
      <div className="text-center mt-16">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Explore the Future of Finance
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks.ai and unlock advanced AI analytics for
          cryptocurrencies, stocks, and more.
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
