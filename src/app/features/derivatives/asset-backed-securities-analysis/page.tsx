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
import { Search, Banknote, ArrowLeft, TrendingUp } from "lucide-react";

export default function AssetBackedSecuritiesAnalysisPage() {
  const [query, setQuery] = useState("MBS"); // default asset-backed security
  const [data, setData] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const fetchABSData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/rating/${symbol}?apikey=${fmpKey}`
      );
      const json = await res.json();

      if (!json || json.length === 0) throw new Error("No data found");

      const latest = json[0];
      setData(latest);

      const mockChart = Array.from({ length: 7 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        yield: 3.5 + Math.random() * 0.4,
      }));
      setChartData(mockChart);

      fetchAiSummary(symbol, latest);
    } catch (err: any) {
      console.error(err);
      setError("Could not retrieve ABS data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async (symbol: string, latest: any) => {
    try {
      const prompt = `
      Write a 3-sentence analysis on the current performance of ${symbol} asset-backed securities.
      Include yield trends, risk sentiment, and investor demand. Assume recent yield: ${latest.ratingScore || "N/A"}.
      Keep tone objective and professional.
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

  useEffect(() => {
    fetchABSData(query);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== "") fetchABSData(query.trim());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Back */}
      <Link
        href="/features"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-yellow-600 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Features
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Banknote className="w-6 h-6 text-yellow-500" />
        <h1 className="text-3xl font-bold text-gray-900">
          Asset-Backed Securities Analysis
        </h1>
      </div>
      <p className="text-gray-600 mb-8 text-lg">
        Explore mortgage-backed and consumer ABS performance, yields, and
        prepayment trends with live insights.
      </p>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-white shadow rounded-full border border-gray-200 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ABS ticker (e.g. MBS, ABS, GNMA)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-700"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && <p>Loading ABS data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Chart */}
          <div className="bg-white rounded-3xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" /> Yield Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="#FACC15"
                  fill="#FEF08A"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {aiSummary && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-2">
                AI Market Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </>
      )}

      <div className="mt-10 text-xs text-gray-500 leading-relaxed">
        <strong>Disclaimer:</strong> Data and commentary are for educational
        purposes only and not investment advice.
      </div>
    </div>
  );
}
