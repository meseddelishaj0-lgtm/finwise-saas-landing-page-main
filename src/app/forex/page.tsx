"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Search, Globe2 } from "lucide-react";

interface Forex {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  dayLow?: number;
  dayHigh?: number;
}

export default function ForexPage() {
  const [forex, setForex] = useState<Forex[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Forex>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchForex = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/forex", { method: "POST" });
      const { data } = await res.json();
      setForex(data || []);
    } catch (err) {
      console.error("Error fetching forex:", err);
      setForex([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForex();
  }, []);

  const filtered = forex
    .filter(
      (f) =>
        f.symbol?.toLowerCase().includes(query.toLowerCase()) ||
        f.name?.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortKey] ?? 0;
      const valB = b[sortKey] ?? 0;
      return sortDir === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const toggleSort = (key: keyof Forex) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else setSortKey(key);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 pb-10 px-6 flex flex-col items-center">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <Globe2 className="text-yellow-400" /> Forex Market Overview
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Track live currency exchange rates — including major, minor, and exotic pairs — across global markets.
      </p>

      {/* Search + Refresh */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="flex items-center bg-white shadow-sm rounded-full border border-gray-200 px-4 py-2 w-full md:w-80">
          <Search className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search currency pair (e.g., EUR/USD)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchForex()}
            className="flex-grow outline-none text-sm text-gray-700"
          />
        </div>
        <button
          onClick={fetchForex}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="w-full max-w-6xl overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl bg-white shadow-sm">
          <thead className="bg-yellow-100 text-gray-800 font-semibold text-sm">
            <tr>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("symbol")}>
                Pair
              </th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("price")}>
                Price {sortKey === "price" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("change")}>
                Change {sortKey === "change" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("changesPercentage")}>
                Change % {sortKey === "changesPercentage" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-3 text-left">Day Low</th>
              <th className="p-3 text-left">Day High</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  Fetching Forex data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No matching pairs found.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((f, i) => (
                <tr key={i} className="border-t hover:bg-yellow-50 transition">
                  <td className="p-3 font-semibold">{f.symbol}</td>
                  <td className="p-3">${f.price?.toFixed(4) ?? "—"}</td>
                  <td
                    className={`p-3 font-medium ${
                      f.change && f.change >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {f.change?.toFixed(4) ?? "—"}
                  </td>
                  <td
                    className={`p-3 font-medium ${
                      f.changesPercentage && f.changesPercentage >= 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {f.changesPercentage ? `${f.changesPercentage.toFixed(2)}%` : "—"}
                  </td>
                  <td className="p-3">${f.dayLow?.toFixed(4) ?? "—"}</td>
                  <td className="p-3">${f.dayHigh?.toFixed(4) ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
