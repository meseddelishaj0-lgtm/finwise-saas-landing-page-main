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

// Government bond yields have no source on our market-data provider (Twelve
// Data sells instruments, not yield curves). /api/bonds returns the Treasury
// ETFs at each point on the curve instead; this page shows their prices and
// daily moves, labelled as fund prices rather than yields.

export default function GlobalBondsDashboardPage() {
  const [bonds, setBonds] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const prevData = useRef<Record<string, number>>({});

  // Fetch the Treasury ETF ladder
  const fetchBondData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bonds");
      const data = await res.json();
      const ladder = Array.isArray(data?.ladder) ? data.ladder : [];

      const mapped = ladder
        .filter((b: any) => b.symbol && typeof b.price === "number")
        .map((b: any) => ({
          country: "United States",
          symbol: b.symbol,
          name: b.name || b.symbol,
          bucket: b.bucket || "—",
          segment: b.maturity || "—",
          price: b.price,
          changePct:
            typeof b.changesPercentage === "number" ? b.changesPercentage : 0,
          change: typeof b.change === "number" ? b.change : 0,
        }));

      setBonds(mapped);
      setFiltered(mapped);
      setNote(data?.note || "");
      setLastUpdated(new Date().toLocaleTimeString());
      // AI commentary removed — needs a server route
    } catch (err) {
      console.error("Error fetching bond data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 60s
  useEffect(() => {
    fetchBondData();
    const interval = setInterval(fetchBondData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase();
    const results = bonds.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q) ||
        b.symbol.toLowerCase().includes(q) ||
        b.bucket.toLowerCase().includes(q)
    );
    setFiltered(results);
  };

  // Compare changes between refreshes
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
          <Globe2 className="w-6 h-6 text-gold" />
          <h1 className="text-3xl text-ivory font-display font-normal tracking-tight md:text-4xl">
            Treasury Bonds Dashboard
          </h1>
        </div>
        <button
          onClick={fetchBondData}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <p className="text-gray-400 mb-3">
        Track the US Treasury curve through the ETFs at each maturity — prices
        and daily moves, updated every minute.
      </p>
      {note && <p className="text-sm text-gray-500 mb-8">{note}</p>}

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-surface shadow rounded-full border border-white/10 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Treasury ETFs (e.g. TLT, 7-10 years)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-300"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-gold text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <p>Loading bond data...</p>
      ) : (
        <div className="overflow-x-auto bg-surface rounded-2xl shadow border border-white/10">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface2 text-gray-300 border-b">
              <tr>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Maturity</th>
                <th className="py-3 px-4 text-right">Segment</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Change %</th>
                <th className="py-3 px-4 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const priceDir = getDirection(`${b.symbol}-price`, b.price);
                return (
                  <tr key={i} className="border-t hover:bg-gold/10 transition">
                    <td className="py-3 px-4">{b.country}</td>
                    <td className="py-3 px-4 font-medium">{b.symbol}</td>
                    <td className="py-3 px-4">{b.name}</td>
                    <td className="py-3 px-4 text-right">{b.bucket}</td>
                    <td className="py-3 px-4 text-right">{b.segment}</td>

                    {/* Price */}
                    <td
                      className={`py-3 px-4 text-right ${
 b.change < 0 ? "text-red-400" : "text-green-400"
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
 b.changePct < 0 ? "text-red-400" : "text-green-400"
 }`}
                    >
                      {b.changePct.toFixed(2)}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
 b.change < 0 ? "text-red-400" : "text-green-400"
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
        <div className="mt-8 bg-surface rounded-3xl shadow p-6">
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" /> Daily Move by Maturity
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Daily % change of each Treasury ETF, shortest to longest maturity —
            fund prices, not yields.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={filtered.map((b) => ({
                name: b.symbol,
                change: Number(b.changePct.toFixed(2)),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="change"
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

      {/* AI commentary removed — needs a server route */}

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
