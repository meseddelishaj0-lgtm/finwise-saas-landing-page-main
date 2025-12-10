"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Search, Layers3 } from "lucide-react";

interface Derivative {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  exchange?: string;
}

export default function DerivativesPage() {
  const [data, setData] = useState<Derivative[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"futures" | "options" | "swaps" | "forwards">("futures");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof Derivative>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = async (t: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/derivatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: t }),
      });
      const { data } = await res.json();
      setData(data || []);
    } catch (err) {
      console.error("Error fetching derivatives:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(type);
  }, []);

  const filtered = data
    .filter(
      (d) =>
        d.symbol?.toLowerCase().includes(query.toLowerCase()) ||
        d.name?.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortKey] ?? 0;
      const valB = b[sortKey] ?? 0;
      return sortDir === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const toggleSort = (key: keyof Derivative) => {
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
        <Layers3 className="text-yellow-400" /> Derivatives Market Overview
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Explore real-time data for futures, options, swaps, and forward contracts across global markets.
      </p>

      {/* Search & Refresh */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="flex items-center bg-white shadow-sm rounded-full border border-gray-200 px-4 py-2 w-full md:w-80">
          <Search className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(type)}
            className="flex-grow outline-none text-sm text-gray-700"
          />
        </div>
        <button
          onClick={() => fetchData(type)}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {["futures", "options", "swaps", "forwards"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t as any);
              fetchData(t);
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              type === t
                ? "bg-yellow-400 text-black shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="w-full max-w-6xl overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl bg-white shadow-sm">
          <thead className="bg-yellow-100 text-gray-800 font-semibold text-sm">
            <tr>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("symbol")}>
                Symbol
              </th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("name")}>
                Name
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
              <th className="p-3 text-left">Exchange</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  Fetching {type} data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No {type} data found.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 50).map((d, i) => (
                <tr key={i} className="border-t hover:bg-yellow-50 transition">
                  <td className="p-3 font-semibold">{d.symbol}</td>
                  <td className="p-3">{d.name ?? "—"}</td>
                  <td className="p-3">${d.price?.toFixed(2) ?? "—"}</td>
                  <td
                    className={`p-3 font-medium ${
                      d.change && d.change >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {d.change?.toFixed(2) ?? "—"}
                  </td>
                  <td
                    className={`p-3 font-medium ${
                      d.changesPercentage && d.changesPercentage >= 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {d.changesPercentage ? `${d.changesPercentage.toFixed(2)}%` : "—"}
                  </td>
                  <td className="p-3">{d.exchange ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
