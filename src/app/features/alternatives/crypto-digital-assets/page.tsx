"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  marketCap: number;
  volume: number;
}

type SortKey = "marketCap" | "price" | "changesPercentage";

export default function CryptoScreenerPage() {
  const [cryptos, setCryptos] = useState<CryptoQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/proxy/fmp/api/v3/quotes/crypto`
        );
        if (!res.ok) throw new Error("Failed to fetch crypto data");
        const data = await res.json();
        const top = data
          .filter(
            (coin: any) =>
              coin.price && coin.marketCap && coin.changesPercentage !== null
          )
          .map((coin: any) => ({
            symbol: coin.symbol,
            name: coin.name,
            price: coin.price,
            changesPercentage: coin.changesPercentage,
            marketCap: coin.marketCap,
            volume: coin.volume ?? 0,
          }))
          .sort((a: CryptoQuote, b: CryptoQuote) => b.marketCap - a.marketCap)
          .slice(0, 100);
        setCryptos(top);
      } catch (err: any) {
        console.error(err);
        setError("Unable to load crypto data.");
      } finally {
        setLoading(false);
      }
    };
    fetchCryptos();
  }, []);

  const filteredCryptos = useMemo(() => {
    let filtered = cryptos.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered = filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return filtered;
  }, [cryptos, searchTerm, sortKey, sortAsc]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading live crypto data...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleRowClick = (coin: CryptoQuote) => {
    router.push(
      `/features/alternatives/crypto-digital-assets/coin/${coin.symbol}`
    );
  };

  return (
    <main className="min-h-screen bg-night text-ivory px-6 pt-10 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Back to Features */}
        <div className="flex justify-start mb-6">
          <button
            onClick={() => router.push("/features")}
            className="flex items-center gap-2 text-sm text-gold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Features
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl mb-3 mt-4 font-display font-normal tracking-tight">
            Crypto & Digital Assets Screener
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track live prices, performance, and market caps of top
            cryptocurrencies — powered by your WallStreetStocks.ai
          </p>
        </motion.div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          {/* Search bar */}
          <div className="flex items-center bg-surface2 border border-white/10 rounded-full px-4 py-2 w-full max-w-md shadow-sm">
            <Search className="w-5 h-5 text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search crypto (e.g. BTC, Ethereum)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-300 placeholder-gray-400"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-4">
            <button
              className={`px-4 py-2 rounded-full border ${
 sortKey === "marketCap"
 ? "border-gold/40 text-gold"
 : "border-white/10 text-gray-300"
 }`}
              onClick={() => handleSortChange("marketCap")}
            >
              Market Cap {sortKey === "marketCap" && (sortAsc ? "↑" : "↓")}
            </button>
            <button
              className={`px-4 py-2 rounded-full border ${
 sortKey === "price"
 ? "border-gold/40 text-gold"
 : "border-white/10 text-gray-300"
 }`}
              onClick={() => handleSortChange("price")}
            >
              Price {sortKey === "price" && (sortAsc ? "↑" : "↓")}
            </button>
            <button
              className={`px-4 py-2 rounded-full border ${
 sortKey === "changesPercentage"
 ? "border-gold/40 text-gold"
 : "border-white/10 text-gray-300"
 }`}
              onClick={() => handleSortChange("changesPercentage")}
            >
              Change %{" "}
              {sortKey === "changesPercentage" && (sortAsc ? "↑" : "↓")}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-2xl shadow-sm">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-surface2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Price (USD)
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Change %
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredCryptos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-gray-500 py-6 text-sm"
                  >
                    No results found.
                  </td>
                </tr>
              ) : (
                filteredCryptos.map((coin, index) => (
                  <tr
                    key={coin.symbol}
                    className="hover:bg-surface2 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleRowClick(coin)}
                  >
                    <td className="px-6 py-3 text-sm text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-ivory flex items-center gap-2">
                      {coin.name}
                      <span className="text-gray-400 uppercase text-xs">
                        ({coin.symbol})
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold">
                      ${coin.price.toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-3 text-sm text-right font-semibold flex items-center justify-end gap-1 ${
 coin.changesPercentage >= 0
 ? "text-green-400"
 : "text-red-400"
 }`}
                    >
                      {coin.changesPercentage >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {coin.changesPercentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-300">
                      ${coin.marketCap.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-300">
                      ${coin.volume.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Data auto-refreshes from WallStreetStocks.ai
        </p>
      </div>
    </main>
  );
}
