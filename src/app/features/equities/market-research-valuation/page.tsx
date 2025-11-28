"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type SortKey = "price" | "changesPercentage" | "volume" | "marketCap" | "sector";

export default function MarketScreenerPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/market", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch market data");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Failed to fetch stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let filtered = data.filter(
      (d: any) =>
        d.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a: any, b: any) => {
      const aVal = a[sortKey] || 0;
      const bVal = b[sortKey] || 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [data, searchTerm, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  // 🟢 TradingView Widget Loader
  const loadTradingView = (symbol: string) => {
    const existing = document.getElementById("tv-widget");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "tv-widget";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      new TradingView.widget({
        autosize: true,
        symbol: `NASDAQ:${symbol}`,
        interval: "30",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        container_id: "tradingview_chart",
      });
    };
    document.body.appendChild(script);
  };

  const openChart = (ticker: string) => {
    setSelectedTicker(ticker);
    setTimeout(() => loadTradingView(ticker), 100);
  };

  const closeChart = () => {
    setSelectedTicker(null);
    const existing = document.getElementById("tv-widget");
    if (existing) existing.remove();
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 pt-28 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/features")}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded-full mb-8 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">All US Stocks</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore the full U.S. stock market — prices, volumes, and live charts.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by symbol or company name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-yellow-400 outline-none text-gray-700"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading stock data...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-10">{error}</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Company
                  </th>
                  {[
                    { key: "price", label: "Price" },
                    { key: "changesPercentage", label: "Change %" },
                    { key: "volume", label: "Volume" },
                    { key: "marketCap", label: "Market Cap" },
                    { key: "sector", label: "Sector" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key as SortKey)}
                      className="px-6 py-3 text-right font-semibold text-gray-700 cursor-pointer select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {label}
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortKey === key ? "text-yellow-500" : "text-gray-400"
                          }`}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((d: any, idx) => (
                  <tr
                    key={idx}
                    onClick={() => openChart(d.symbol)}
                    className="hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {d.symbol}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {d.companyName}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      ${Number(d.price || 0).toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-semibold ${
                        d.changesPercentage >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {Number(d.changesPercentage || 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">
                      {d.volume ? d.volume.toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">
                      {d.marketCap
                        ? (d.marketCap / 1e9).toFixed(2) + "B"
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {d.sector || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chart Modal */}
        {selectedTicker && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-5xl p-4 relative">
              <button
                onClick={closeChart}
                className="absolute top-3 right-3 text-gray-600 hover:text-black"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold mb-3 text-center">
                {selectedTicker} — Live Chart
              </h2>
              <div id="tradingview_chart" className="w-full h-[600px]" />
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mt-8 text-center">
          <strong>Disclaimer:</strong> Market data is for informational purposes only.
          WallStreetStocks.ai does not provide investment advice.
        </p>
      </div>
    </main>
  );
}
