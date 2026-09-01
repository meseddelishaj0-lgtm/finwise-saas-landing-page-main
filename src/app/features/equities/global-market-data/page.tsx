"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ArrowUp,
  ArrowDown,
  BarChart4,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function GlobalMarketDataPage() {
  const router = useRouter();
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/global", { cache: "no-store" });
      const json = await res.json();
      setIndices(json);
    } catch (error) {
      console.error("Error loading indices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let data = indices;

    if (tab === "gainers") {
      data = data
        .filter((d) => d.changesPercentage > 0)
        .sort((a, b) => b.changesPercentage - a.changesPercentage);
    } else if (tab === "losers") {
      data = data
        .filter((d) => d.changesPercentage < 0)
        .sort((a, b) => a.changesPercentage - b.changesPercentage);
    } else if (tab === "active") {
      data = data.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    }

    if (search.trim() !== "") {
      data = data.filter(
        (d) =>
          d.symbol?.toLowerCase().includes(search.toLowerCase()) ||
          d.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return data.slice(0, 100);
  }, [indices, tab, search]);

  const openChart = (symbol: string) => setSelectedSymbol(symbol);
  const closeChart = () => setSelectedSymbol(null);

  const formatArrow = (value: number) => {
    if (value > 0)
      return (
        <span className="inline-flex items-center text-green-400">
          <ArrowUp className="w-3 h-3 mr-1" /> {value.toFixed(2)}
        </span>
      );
    if (value < 0)
      return (
        <span className="inline-flex items-center text-red-400">
          <ArrowDown className="w-3 h-3 mr-1" /> {Math.abs(value).toFixed(2)}
        </span>
      );
    return <span className="text-gray-400">{value.toFixed(2)}</span>;
  };

  return (
    <main className="min-h-screen bg-night text-ivory px-6 pt-10 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/features")}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-gold text-black font-medium px-4 py-2 rounded-full mb-8 transition-all shadow-sm"
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
          <h1 className="text-4xl mb-2 flex items-center justify-center gap-2 font-display font-normal tracking-tight md:text-5xl">
            <BarChart4 className="w-8 h-8 text-gold" /> Global Market Indices
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track global stock indices, gainers, losers, and active movers with real-time updates.
          </p>
        </motion.div>

        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex gap-3">
            {["all", "gainers", "losers", "active"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
 tab === t
 ? "bg-yellow-400 text-black border-yellow-400"
 : "bg-surface text-gray-400 border-white/10 hover:bg-surface2"
 }`}
              >
                {t === "all" && "All"}
                {t === "gainers" && "Top Gainers"}
                {t === "losers" && "Top Losers"}
                {t === "active" && "Most Active"}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search index (e.g. SPX, DAX, N225)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-full focus:ring-2 focus:ring-yellow-400 outline-none text-gray-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-surface border border-white/10 rounded-2xl shadow-sm">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading global indices...</p>
          ) : (
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-surface2">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Symbol</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Price</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Change %</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Change</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">High</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Low</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredData.map((d, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gold/10 cursor-pointer transition"
                    onClick={() => openChart(d.symbol)}
                  >
                    <td className="px-6 py-3 font-medium text-gray-100">{d.symbol}</td>
                    <td className="px-6 py-3 text-gray-400">{d.name}</td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {formatArrow(Number(d.price))}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {formatArrow(Number(d.changesPercentage))}
                      <span className="ml-1 text-gray-500">%</span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {formatArrow(Number(d.change))}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-300">
                      {Number(d.dayHigh).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-300">
                      {Number(d.dayLow).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openChart(d.symbol);
                        }}
                        className="text-gold hover:text-gold-soft font-medium"
                      >
                        View Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chart Modal */}
        {selectedSymbol && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-surface rounded-2xl shadow-xl w-[90%] md:w-[70%] lg:w-[60%] relative">
              <button
                onClick={closeChart}
                className="absolute top-2 right-3 text-gray-400 hover:text-ivory text-xl"
              >
                ✕
              </button>
              <h3 className="text-center font-semibold mt-4 mb-2 text-gray-100">
                {selectedSymbol} — Interactive Chart
              </h3>
              <div className="w-full h-[500px] rounded-b-2xl overflow-hidden">
                <iframe
                  src={`https://s.tradingview.com/widgetembed/?symbol=${selectedSymbol}&interval=60&hidesidetoolbar=1&theme=light`}
                  width="100%"
                  height="100%"
                  allowTransparency
                  frameBorder="0"
                  title="TradingView Chart"
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mt-10 text-center">
          <strong>Disclaimer:</strong> Market data is for informational purposes only. 
          WallStreetStocks.ai does not provide investment advice.
        </p>
      </div>
    </main>
  );
}
