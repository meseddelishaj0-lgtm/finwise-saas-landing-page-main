"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Edit3,
  Save,
  X,
} from "lucide-react";

type Stock = {
  ticker: string;
  shares: number;
  cost: number;
  currentPrice?: number;
};

type Portfolio = {
  name: string;
  stocks: Stock[];
};

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#8B5CF6",
  "#F97316",
  "#14B8A6",
];
const FINNHUB = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "";

const PortfolioPage = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [active, setActive] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editCost, setEditCost] = useState("");

  // Load portfolios
  useEffect(() => {
    const saved = localStorage.getItem("portfolios");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPortfolios(parsed);
      setActive(parsed[0]?.name || "");
    }
  }, []);

  // Save portfolios
  useEffect(() => {
    if (portfolios.length)
      localStorage.setItem("portfolios", JSON.stringify(portfolios));
  }, [portfolios]);

  const activePortfolio = portfolios.find((p) => p.name === active);

  const totalValue =
    activePortfolio?.stocks.reduce(
      (acc, s) => acc + (s.currentPrice || 0) * s.shares,
      0
    ) || 0;
  const totalCost =
    activePortfolio?.stocks.reduce((acc, s) => acc + s.cost * s.shares, 0) || 0;
  const gain = totalValue - totalCost;
  const gainPct = totalCost ? (gain / totalCost) * 100 : 0;

  const createPortfolio = () => {
    const name = prompt("Enter portfolio name:");
    if (!name) return;
    const newP: Portfolio = { name, stocks: [] };
    setPortfolios([...portfolios, newP]);
    setActive(name);
  };

  const deletePortfolio = (name: string) => {
    if (!confirm(`Delete portfolio ${name}?`)) return;
    const updated = portfolios.filter((p) => p.name !== name);
    setPortfolios(updated);
    if (updated.length) setActive(updated[0].name);
  };

  const addStock = async () => {
    if (!newTicker || !newShares || !newCost) return alert("Fill all fields");
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${newTicker}&token=${FINNHUB}`
      );
      const data = await res.json();
      const currentPrice = data.c || 0;
      const stock: Stock = {
        ticker: newTicker.toUpperCase(),
        shares: Number(newShares),
        cost: Number(newCost),
        currentPrice,
      };
      const updated = portfolios.map((p) =>
        p.name === active ? { ...p, stocks: [...p.stocks, stock] } : p
      );
      setPortfolios(updated);
      setNewTicker("");
      setNewShares("");
      setNewCost("");
      setShowAdd(false);
    } catch {
      alert("Error adding stock");
    }
  };

  const deleteStock = (ticker: string) => {
    if (!confirm(`Remove ${ticker}?`)) return;
    const updated = portfolios.map((p) =>
      p.name === active
        ? { ...p, stocks: p.stocks.filter((s) => s.ticker !== ticker) }
        : p
    );
    setPortfolios(updated);
  };

  const startEdit = (s: Stock) => {
    setEditingTicker(s.ticker);
    setEditShares(s.shares.toString());
    setEditCost(s.cost.toString());
  };

  const saveEdit = (ticker: string) => {
    const updated = portfolios.map((p) =>
      p.name === active
        ? {
            ...p,
            stocks: p.stocks.map((s) =>
              s.ticker === ticker
                ? {
                    ...s,
                    shares: Number(editShares),
                    cost: Number(editCost),
                  }
                : s
            ),
          }
        : p
    );
    setPortfolios(updated);
    setEditingTicker(null);
  };

  const pieData =
    activePortfolio?.stocks.map((s) => ({
      name: s.ticker,
      value: (s.currentPrice || 0) * s.shares,
    })) || [];

  return (
    <section className="min-h-screen bg-gray-50 text-gray-900 px-6 md:px-16 pt-24 pb-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
        {/* Left side: Portfolio summary */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">📊 My Portfolio</h1>
              <select
                value={active}
                onChange={(e) => setActive(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {portfolios.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={createPortfolio}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-2 rounded-lg font-semibold"
              >
                + New
              </button>
            </div>
            {active && (
              <button
                onClick={() => deletePortfolio(active)}
                className="text-red-500 flex items-center gap-1 text-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6 mb-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Total Value</p>
                <h2 className="text-3xl font-bold">${totalValue.toFixed(2)}</h2>
              </div>
              <p
                className={`font-semibold ${
                  gain >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {gain >= 0 ? "▲" : "▼"} ${gain.toFixed(2)} ({gainPct.toFixed(2)}%)
              </p>
            </div>
          </motion.div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="text-yellow-500 w-5 h-5" /> Allocation
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right side: Holdings */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="text-yellow-500 w-5 h-5" /> Holdings
            </h3>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm font-semibold"
            >
              + Add Stock
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="text-left py-2">Ticker</th>
                <th>Shares</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activePortfolio?.stocks.map((s) => (
                <tr key={s.ticker} className="border-b">
                  <td className="py-2 font-semibold">{s.ticker}</td>

                  {editingTicker === s.ticker ? (
                    <>
                      <td>
                        <input
                          type="number"
                          value={editShares}
                          onChange={(e) => setEditShares(e.target.value)}
                          className="border rounded px-2 py-1 w-16"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editCost}
                          onChange={(e) => setEditCost(e.target.value)}
                          className="border rounded px-2 py-1 w-20"
                        />
                      </td>
                      <td>${s.currentPrice?.toFixed(2)}</td>
                      <td>${((s.currentPrice || 0) * s.shares).toFixed(2)}</td>
                      <td className="flex gap-2 justify-center">
                        <button
                          onClick={() => saveEdit(s.ticker)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => setEditingTicker(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{s.shares}</td>
                      <td>${s.cost}</td>
                      <td>${s.currentPrice?.toFixed(2)}</td>
                      <td>${((s.currentPrice || 0) * s.shares).toFixed(2)}</td>
                      <td className="flex gap-2 justify-center">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-yellow-500 hover:text-yellow-600"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteStock(s.ticker)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Add Stock</h3>
            <input
              type="text"
              placeholder="Ticker (e.g. AAPL)"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />
            <input
              type="number"
              placeholder="Shares"
              value={newShares}
              onChange={(e) => setNewShares(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />
            <input
              type="number"
              placeholder="Cost per Share"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addStock}
                className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PortfolioPage;
