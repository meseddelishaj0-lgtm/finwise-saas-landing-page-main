"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  Globe2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function GlobalBondsDashboardPage() {
  const [bonds, setBonds] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const prevData = useRef<Record<string, number>>({});

  const fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // ✅ Fetch live bonds directly from FMP
  const fetchBondData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v4/government_bonds_yield?apikey=${fmpKey}`
      );
      const data = await res.json();

      const mapped = data
        .filter((b: any) => b.symbol && b.yield)
        .map((b: any) => ({
          country: b.country || "N/A",
          symbol: b.symbol,
          name: b.name || "Government Bond",
          coupon: b.coupon ? `${b.coupon.toFixed(3)}%` : "0.000%",
          yield: b.yield ? parseFloat(b.yield) : null,
          maturityDate: b.maturityDate || "—",
          termToMaturity: b.termToMaturity || "—",
          price: b.price ? parseFloat(b.price) : null,
          changePct: b.changeInPercent ? parseFloat(b.changeInPercent) : 0,
          change: b.change ? parseFloat(b.change) : 0,
          date: b.lastUpdated || b.date || "—",
        }));

      setBonds(mapped);
      setFiltered(mapped);
      setLastUpdated(new Date().toLocaleTimeString());
      fetchAiSummary(mapped.slice(0, 8));
    } catch (err) {
      console.error("Error fetching bond data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ AI summary
  const fetchAiSummary = async (data: any[]) => {
    try {
      const summaryText = data
        .filter((b) => b.yield)
        .map((b) => `${b.symbol}: ${b.yield}%`)
        .join(", ");

      const prompt = `
        Provide a short professional 3–5 sentence analysis of global bond yields.
        Data: ${summaryText}.
        Focus on inflation expectations, interest rate direction, and investor sentiment.
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
      console.error("AI summary error", err);
    }
  };

  // ✅ Auto-refresh every 60s
  useEffect(() => {
    fetchBondData();
    const interval = setInterval(fetchBondData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase();
    const results = bonds.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q) ||
        b.symbol.toLowerCase().includes(q)
    );
    setFiltered(results);
  };

  // ✅ Compare changes between refreshes
  const getDirection = (symbol: string, current: number | null) => {
    if (current === null) return null;
    const prev = prevData.current[symbol];
    prevData.current[symbol] = current;
    if (prev === undefined) return null;
    if (current > prev) return "up";
    if (current < prev) return "down";
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="w-6 h-6 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">
            Global Bonds Dashboard
          </h1>
        </div>
        <button
          onClick={fetchBondData}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-yellow-600 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <p className="text-gray-600 mb-8">
        Track global yields, coupons, and price changes — updated every minute
        with live data and AI-driven insights.
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
          placeholder="Search Global Bonds (e.g. US10Y, Germany)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-700"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <p>Loading bond data...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Coupon</th>
                <th className="py-3 px-4 text-right">Yield %</th>
                <th className="py-3 px-4 text-right">Maturity Date</th>
                <th className="py-3 px-4 text-right">Term</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Change %</th>
                <th className="py-3 px-4 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const yieldDir = getDirection(`${b.symbol}-yield`, b.yield);
                const priceDir = getDirection(`${b.symbol}-price`, b.price);
                return (
                  <tr key={i} className="border-t hover:bg-yellow-50 transition">
                    <td className="py-3 px-4">{b.country}</td>
                    <td className="py-3 px-4 font-medium">{b.symbol}</td>
                    <td className="py-3 px-4">{b.name}</td>
                    <td className="py-3 px-4 text-right">{b.coupon}</td>

                    {/* Yield */}
                    <td
                      className={`py-3 px-4 text-right ${
                        b.changePct < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {b.yield ? `${b.yield.toFixed(3)}%` : "—"}
                      {yieldDir === "up" && (
                        <ArrowUpRight className="inline w-4 h-4 ml-1 text-green-500" />
                      )}
                      {yieldDir === "down" && (
                        <ArrowDownRight className="inline w-4 h-4 ml-1 text-red-500" />
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">{b.maturityDate}</td>
                    <td className="py-3 px-4 text-right">{b.termToMaturity}</td>

                    {/* Price */}
                    <td
                      className={`py-3 px-4 text-right ${
                        b.change < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {b.price ? b.price.toFixed(3) : "—"}
                      {priceDir === "up" && (
                        <ArrowUpRight className="inline w-4 h-4 ml-1 text-green-500" />
                      )}
                      {priceDir === "down" && (
                        <ArrowDownRight className="inline w-4 h-4 ml-1 text-red-500" />
                      )}
                    </td>

                    <td
                      className={`py-3 px-4 text-right ${
                        b.changePct < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {b.changePct.toFixed(2)}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        b.change < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {b.change.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart */}
      {!loading && filtered.length > 0 && (
        <div className="mt-8 bg-white rounded-3xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" /> Global Yield Curve
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={filtered
                .filter((b) => b.yield)
                .map((b) => ({
                  name: b.symbol,
                  yield: b.yield,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
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
          <p className="text-xs text-gray-400 text-right mt-2">
            Last updated: {lastUpdated}
          </p>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-2">
            AI Global Bond Market Summary
          </h3>
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {aiSummary}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-10 text-xs text-gray-500">
        <p>
          <strong>Disclaimer:</strong> Data is for informational use only. Not
          financial advice.
        </p>
      </div>
    </div>
  );
}
