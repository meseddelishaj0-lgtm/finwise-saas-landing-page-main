"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Search,
  BarChart4,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type SortKey = "symbol" | "price" | "changesPercentage" | "volume" | "marketCap" | "exchange";

export default function ETFScreenerPage() {
  const router = useRouter();
  const [etfs, setEtfs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch ETF data
  useEffect(() => {
    const fetchEtfs = async () => {
      try {
        const res = await fetch("/api/etf");
        const data = await res.json();
        setEtfs(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEtfs();
  }, []);

  // Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const filtered = useMemo(() => {
    return etfs
      .filter(
        (etf) =>
          etf.symbol?.toLowerCase().includes(search.toLowerCase()) ||
          etf.name?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === undefined || bVal === undefined) return 0;

        if (typeof aVal === "string") {
          return sortOrder === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [etfs, search, sortKey, sortOrder]);

  return (
    <div className="p-6 max-w-7xl mx-auto text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} /> Back to Features
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart4 className="text-yellow-500" /> ETF Screener Analysis
        </h1>
      </div>

      {/* Search */}
      <div className="flex items-center bg-gray-100 px-4 py-2 rounded-xl mb-6 shadow-inner">
        <Search className="text-gray-500 mr-2" size={18} />
        <input
          type="text"
          placeholder="Search ETFs (e.g. SPY, QQQ, VTI)"
          className="bg-transparent flex-1 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th onClick={() => handleSort("symbol")} className="py-3 px-4 text-left cursor-pointer">
                Symbol <ArrowUpDown size={14} className="inline ml-1" />
              </th>
              <th className="py-3 px-4 text-left">Name</th>
              <th onClick={() => handleSort("price")} className="py-3 px-4 text-right cursor-pointer">
                Price <ArrowUpDown size={14} className="inline ml-1" />
              </th>
              <th
                onClick={() => handleSort("changesPercentage")}
                className="py-3 px-4 text-right cursor-pointer"
              >
                Change % <ArrowUpDown size={14} className="inline ml-1" />
              </th>
              <th onClick={() => handleSort("volume")} className="py-3 px-4 text-right cursor-pointer">
                Volume <ArrowUpDown size={14} className="inline ml-1" />
              </th>
              <th
                onClick={() => handleSort("marketCap")}
                className="py-3 px-4 text-right cursor-pointer"
              >
                Market Cap <ArrowUpDown size={14} className="inline ml-1" />
              </th>
              <th
                onClick={() => handleSort("exchange")}
                className="py-3 px-4 text-right cursor-pointer"
              >
                Exchange <ArrowUpDown size={14} className="inline ml-1" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((etf, idx) => (
              <motion.tr
                key={etf.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="py-2 px-4 font-semibold">{etf.symbol}</td>
                <td className="py-2 px-4 text-gray-600">{etf.name}</td>
                <td className="py-2 px-4 text-right">
                  {etf.price ? `$${etf.price.toFixed(2)}` : "—"}
                </td>
                <td
                  className={`py-2 px-4 text-right font-semibold ${
                    etf.changesPercentage > 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {etf.changesPercentage
                    ? `${etf.changesPercentage.toFixed(2)}%`
                    : "%"}
                  {etf.changesPercentage > 0 ? (
                    <ArrowUpRight size={14} className="inline ml-1" />
                  ) : (
                    <ArrowDownRight size={14} className="inline ml-1" />
                  )}
                </td>
                <td className="py-2 px-4 text-right">
                  {etf.volume ? etf.volume.toLocaleString() : "—"}
                </td>
                <td className="py-2 px-4 text-right">
                  {etf.marketCap
                    ? `$${(etf.marketCap / 1_000_000_000).toFixed(2)}B`
                    : "—"}
                </td>
                <td className="py-2 px-4 text-right text-gray-500">
                  {etf.exchange || "—"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
