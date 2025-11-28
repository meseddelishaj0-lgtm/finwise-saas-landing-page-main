"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Search, BarChart4 } from "lucide-react";

interface ScreenerItem {
  symbol?: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  exchange?: string;
  currency?: string;
  country?: string;
  yield?: number;
}

export default function ScreenersPage() {
  const [data, setData] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("stocks");
  const [query, setQuery] = useState("");

  const fetchData = async (assetType: string, q?: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/screeners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: assetType, query: q }),
      });
      const { data } = await res.json();
      setData(data || []);
    } catch (err) {
      console.error("Error fetching screener data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(type);
  }, []);

  const renderTableHeaders = () => {
    switch (type) {
      case "stocks":
        return ["Symbol", "Name", "Price", "Change %", "Exchange"];
      case "etf":
        return ["Symbol", "Name"];
      case "crypto":
        return ["Symbol", "Name"];
      case "forex":
        return ["Symbol", "Price"];
      case "bonds":
        return ["Country", "10Y Yield"];
      default:
        return [];
    }
  };

  const renderRow = (item: any, idx: number) => {
    switch (type) {
      case "stocks":
        return (
          <tr key={idx} className="border-t hover:bg-yellow-50 transition">
            <td className="p-3 font-semibold">{item.symbol}</td>
            <td className="p-3">{item.companyName}</td>
            <td className="p-3">${item.price?.toFixed(2)}</td>
            <td
              className={`p-3 font-medium ${
                item.changesPercentage >= 0
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {item.changesPercentage?.toFixed(2)}%
            </td>
            <td className="p-3">{item.exchange}</td>
          </tr>
        );
      case "etf":
        return (
          <tr key={idx} className="border-t hover:bg-yellow-50 transition">
            <td className="p-3 font-semibold">{item.symbol}</td>
            <td className="p-3">{item.name}</td>
          </tr>
        );
      case "crypto":
        return (
          <tr key={idx} className="border-t hover:bg-yellow-50 transition">
            <td className="p-3 font-semibold">{item.symbol}</td>
            <td className="p-3">{item.name}</td>
          </tr>
        );
      case "forex":
        return (
          <tr key={idx} className="border-t hover:bg-yellow-50 transition">
            <td className="p-3 font-semibold">{item.ticker}</td>
            <td className="p-3">{item.bid}</td>
          </tr>
        );
      case "bonds":
        return (
          <tr key={idx} className="border-t hover:bg-yellow-50 transition">
            <td className="p-3 font-semibold">{item.country}</td>
            <td className="p-3">{item.tenYearYield?.toFixed(2)}%</td>
          </tr>
        );
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 pb-10 px-6 flex flex-col items-center">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <BarChart4 className="text-yellow-400" /> Market Screeners
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Explore AI-powered screeners for Stocks, ETFs, Bonds, Crypto, and Forex.
      </p>

      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="flex items-center bg-white shadow-sm rounded-full border border-gray-200 px-4 py-2 w-full md:w-80">
          <Search className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(type, query)}
            className="flex-grow outline-none text-sm text-gray-700"
          />
        </div>
        <button
          onClick={() => fetchData(type, query)}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {["stocks", "etf", "bonds", "crypto", "forex"].map((asset) => (
          <button
            key={asset}
            onClick={() => {
              setType(asset);
              fetchData(asset);
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              type === asset
                ? "bg-yellow-400 text-black shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {asset.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="w-full max-w-6xl overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl bg-white shadow-sm">
          <thead className="bg-yellow-100 text-gray-800 font-semibold text-sm">
            <tr>
              {renderTableHeaders().map((header, idx) => (
                <th key={idx} className="p-3 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  Fetching {type} data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No data found.
                </td>
              </tr>
            ) : (
              data.slice(0, 50).map((item, idx) => renderRow(item, idx))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
