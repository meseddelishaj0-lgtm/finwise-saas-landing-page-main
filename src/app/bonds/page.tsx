"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TreasuryRate {
  date: string;
  month1: number;
  month3: number;
  month6: number;
  year1: number;
  year2: number;
  year3: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

export default function BondsPage() {
  const [data, setData] = useState<TreasuryRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/bonds");
        const json = await res.json();
        // The stable/treasury-rates endpoint returns an array; we’ll take the most recent entry
        if (Array.isArray(json.treasuryRates) && json.treasuryRates.length > 0) {
          setData(json.treasuryRates[0]);
        }
      } catch (err) {
        console.error("Error fetching treasury data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const renderCard = (label: string, value: number | undefined) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="border border-gray-200 bg-gray-50 rounded-xl p-6 shadow-sm text-center"
    >
      <h2 className="text-lg font-semibold mb-1 text-gray-800">{label}</h2>
      <p className="text-3xl font-bold text-yellow-500">
        {value ? `${value.toFixed(2)}%` : "—"}
      </p>
    </motion.div>
  );

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-4xl font-bold mb-6 text-center"
      >
        U.S. Treasury Yield Curve
      </motion.h1>

      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Live Treasury rates across short and long-term maturities, updated daily from WallStreetStocks.ai
      </p>

      {loading ? (
        <p className="text-gray-500 mt-10">Loading Treasury data...</p>
      ) : data ? (
        <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {renderCard("1 Month", data.month1)}
          {renderCard("3 Months", data.month3)}
          {renderCard("6 Months", data.month6)}
          {renderCard("1 Year", data.year1)}
          {renderCard("2 Years", data.year2)}
          {renderCard("3 Years", data.year3)}
          {renderCard("5 Years", data.year5)}
          {renderCard("7 Years", data.year7)}
          {renderCard("10 Years", data.year10)}
          {renderCard("20 Years", data.year20)}
          {renderCard("30 Years", data.year30)}
        </div>
      ) : (
        <p className="text-red-500">No data available.</p>
      )}

      {data && (
        <p className="text-sm text-gray-500 mt-10">
          Last Updated: {new Date(data.date).toLocaleDateString()}
        </p>
      )}
    </main>
  );
}
