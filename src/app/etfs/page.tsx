"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

interface ETF {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume: number;
  ytdReturn?: number;
  threeMonthReturn?: number;
  fiftyTwoWeekChange?: number;
}

export default function ETFsPage() {
  const [etfs, setEtfs] = useState<ETF[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<keyof ETF>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchETFs();
  }, []);

  const fetchETFs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/etfs");
      const data = await res.json();
      if (Array.isArray(data)) setEtfs(data);
    } catch (error) {
      console.error("Failed to fetch ETFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortedEtfs = [...etfs].sort((a, b) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    return sortDir === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const handleSort = (key: keyof ETF) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 pt-32 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-4xl font-bold text-gray-900"
        >
          Most Active ETFs
        </motion.h1>
        <button
          onClick={fetchETFs}
          className="flex items-center gap-2 text-sm bg-yellow-500 text-black px-3 py-2 rounded-md hover:bg-yellow-400 transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-300 rounded-xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {[
                { key: "symbol", label: "Symbol" },
                { key: "name", label: "Name" },
                { key: "price", label: "Price" },
                { key: "change", label: "Change" },
                { key: "changesPercentage", label: "% Change" },
                { key: "volume", label: "Volume" },
                { key: "ytdReturn", label: "YTD Return" },
                { key: "threeMonthReturn", label: "3M Return" },
                { key: "fiftyTwoWeekChange", label: "52W Change" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof ETF)}
                  className="px-4 py-3 text-left font-semibold cursor-pointer hover:text-yellow-600 transition"
                >
                  {label}
                  {sortKey === key && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : (
              sortedEtfs.map((etf, idx) => (
                <tr
                  key={idx}
                  className="border-t border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-semibold text-yellow-600">
                    {etf.symbol}
                  </td>
                  <td className="px-4 py-3">{etf.name}</td>
                  <td className="px-4 py-3">${etf.price?.toFixed(2)}</td>
                  <td
                    className={`px-4 py-3 ${
                      etf.change > 0
                        ? "text-green-600"
                        : etf.change < 0
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {etf.change?.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      etf.changesPercentage > 0
                        ? "text-green-600"
                        : etf.changesPercentage < 0
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {etf.changesPercentage?.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    {etf.volume?.toLocaleString("en-US")}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      etf.ytdReturn && etf.ytdReturn > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {etf.ytdReturn ? `${etf.ytdReturn.toFixed(2)}%` : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      etf.threeMonthReturn && etf.threeMonthReturn > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {etf.threeMonthReturn
                      ? `${etf.threeMonthReturn.toFixed(2)}%`
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      etf.fiftyTwoWeekChange && etf.fiftyTwoWeekChange > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {etf.fiftyTwoWeekChange
                      ? `${etf.fiftyTwoWeekChange.toFixed(2)}%`
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Data sourced from WallStreetStocks.ai
      </p>
    </main>
  );
}
