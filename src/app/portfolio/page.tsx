"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Asset {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  quantity: number;
  type: string; // stock, etf, crypto, etc.
}

const COLORS = ["#FACC15", "#4ADE80", "#60A5FA", "#F87171", "#FBBF24"];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Asset[]>([]);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load saved portfolio
  useEffect(() => {
    const saved = localStorage.getItem("portfolio");
    if (saved) setPortfolio(JSON.parse(saved));
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  const fetchQuote = async (ticker: string) => {
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: ticker }),
    });
    const { data } = await res.json();
    return data;
  };

  const addAsset = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    try {
      const data = await fetchQuote(symbol.toUpperCase());
      if (!data) return alert("Symbol not found.");

      const newAsset: Asset = {
        symbol: data.symbol,
        name: data.name,
        price: data.price,
        change: data.changesPercentage,
        quantity,
        type: data.exchange || "N/A",
      };

      setPortfolio((prev) => [...prev, newAsset]);
      setSymbol("");
      setQuantity(1);
    } catch (err) {
      console.error("Error adding asset:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeAsset = (index: number) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== index));
  };

  const totalValue = portfolio.reduce(
    (sum, a) => sum + a.price * a.quantity,
    0
  );

  const pieData = portfolio.map((a) => ({
    name: a.symbol,
    value: (a.price * a.quantity * 100) / totalValue,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 pb-10 px-6 flex flex-col items-center">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <BarChart3 className="text-yellow-400" /> My Portfolio
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Build your custom portfolio. Add stocks, ETFs, or crypto — track live
        prices, allocation, and performance.
      </p>

      {/* Add Asset Form */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-8 w-full max-w-lg">
        <input
          type="text"
          placeholder="Enter ticker (e.g. AAPL, BTCUSD)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="flex-grow border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          onClick={addAsset}
          disabled={loading}
          className="bg-yellow-400 text-black px-5 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Portfolio Table */}
      <div className="w-full max-w-4xl mb-10 overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl bg-white shadow-sm">
          <thead className="bg-yellow-100 text-gray-800 font-semibold text-sm">
            <tr>
              <th className="p-3 text-left">Symbol</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Qty</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Change %</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center p-4 text-gray-500 italic"
                >
                  No assets added yet.
                </td>
              </tr>
            ) : (
              portfolio.map((asset, i) => (
                <tr key={i} className="border-t hover:bg-yellow-50 transition">
                  <td className="p-3 font-semibold">{asset.symbol}</td>
                  <td className="p-3 text-sm">{asset.name}</td>
                  <td className="p-3">{asset.quantity}</td>
                  <td className="p-3">${asset.price?.toFixed(2)}</td>
                  <td className="p-3">
                    ${(asset.price * asset.quantity).toFixed(2)}
                  </td>
                  <td
                    className={`p-3 font-medium ${
                      asset.change >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {asset.change?.toFixed(2)}%
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => removeAsset(i)}
                      className="text-gray-500 hover:text-red-600 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Portfolio Summary */}
      {portfolio.length > 0 && (
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-around bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-10">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Total Portfolio Value
            </h2>
            <p className="text-yellow-500 text-3xl font-extrabold">
              ${totalValue.toFixed(2)}
            </p>
          </div>
          <div className="w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  fill="#FACC15"
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </main>
  );
}
