"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Search,
  ArrowLeft,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function FuturesMarketAnalysisPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // ✅ Fetch all futures data from FMP Ultimate
  const fetchFuturesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/quotes/commodity?apikey=${fmpKey}`
      );
      const json = await res.json();
      if (!json || json.length === 0) throw new Error("No data found");
      setData(json);
      setFiltered(json);
      fetchAiSummary(json);
    } catch (err) {
      console.error(err);
      setError("Failed to load futures data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ AI summary
  const fetchAiSummary = async (contracts: any[]) => {
    try {
      const top5 = contracts
        .slice(0, 5)
        .map(
          (c) =>
            `${c.name}: $${c.price.toFixed(2)} (${c.changesPercentage.toFixed(2)}%)`
        )
        .join(", ");
      const prompt = `
      Provide a short market overview for key global futures:
      ${top5}.
      Focus on major movers, market sentiment, and macroeconomic themes.
      Keep it under 4 sentences.
      `;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const json = await res.json();
      setAiSummary(json.choices?.[0]?.message?.content || "");
    } catch (err) {
      console.error("AI Summary Error:", err);
    }
  };

  // ✅ Filter function
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() === "") {
      setFiltered(data);
      return;
    }
    const q = query.toLowerCase();
    const results = data.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q)
    );
    setFiltered(results);
  };

  // ✅ Auto-refresh
  useEffect(() => {
    fetchFuturesData();
    const interval = setInterval(fetchFuturesData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* 🔙 Back Button */}
      <div className="mb-4">
        <Link
          href="/features"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-yellow-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>
      </div>

      {/* 🔰 Title */}
      <div className="flex items-center gap-3 mb-3">
        <BarChart3 className="w-6 h-6 text-yellow-500" />
        <h1 className="text-3xl font-bold text-gray-900">Futures Market Analysis</h1>
      </div>
      <p className="text-gray-600 mb-8 text-base">
        Search and analyze real-time futures contracts with AI-generated insights powered by WallStreetStocks.ai.
      </p>

      {/* 🔍 Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-white shadow rounded-full border border-gray-200 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search futures (e.g. Gold, Crude Oil, 10Y Yield)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-700"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && <p>Loading futures data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* 📊 Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Change</th>
                <th className="py-3 px-4 text-right">Change %</th>
                <th className="py-3 px-4 text-right">High</th>
                <th className="py-3 px-4 text-right">Low</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-t hover:bg-yellow-50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {item.symbol}
                  </td>
                  <td className="py-3 px-4">{item.name}</td>
                  <td className="py-3 px-4 text-right">
                    ${item.price?.toFixed(2)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right ${
                      item.change > 0
                        ? "text-green-600"
                        : item.change < 0
                        ? "text-red-600"
                        : "text-gray-700"
                    }`}
                  >
                    {item.change?.toFixed(2)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right ${
                      item.changesPercentage > 0
                        ? "text-green-600"
                        : item.changesPercentage < 0
                        ? "text-red-600"
                        : "text-gray-700"
                    }`}
                  >
                    {item.changesPercentage?.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    ${item.dayHigh?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ${item.dayLow?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📈 Optional Mini Chart */}
      {!loading && filtered.length > 0 && (
        <div className="mt-8 bg-white rounded-3xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" /> Sample Trend (First 5 Contracts)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={filtered.slice(0, 5).map((d) => ({
                name: d.symbol,
                value: d.price,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#FACC15"
                fill="#FEF08A"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 🤖 AI Summary */}
      {aiSummary && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-2">AI Market Overview</h3>
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {aiSummary}
          </p>
        </div>
      )}

      {/* ⚠️ Disclaimer */}
      <div className="mt-10 text-xs text-gray-500 leading-relaxed">
        <p>
          <strong>Disclaimer:</strong> WallStreetStocks.ai provides financial
          market data and analysis for educational and informational purposes.
          This does not constitute investment advice or trading recommendations.
        </p>
      </div>
    </div>
  );
}
