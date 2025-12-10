"use client";

import React, { useEffect, useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MATrackerPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDeals: 0,
    topCompany: "—",
  });
  const [lastUpdated, setLastUpdated] = useState("");
  const router = useRouter();

  const fetchDeals = async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch("/api/ma", { cache: "no-store" });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setDeals([]);
        setStats({ totalDeals: 0, topCompany: "—" });
        setLoading(false);
        return;
      }

      // Filter out incomplete rows
      const valid = data.filter(
        (d: any) => d.companyName && d.targetedCompanyName
      );

      // Optional search filter
      const filtered = search
        ? valid.filter(
            (d: any) =>
              d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
              d.targetedCompanyName
                ?.toLowerCase()
                .includes(search.toLowerCase())
          )
        : valid;

      // Sort by most recent
      const sorted = filtered.sort(
        (a: any, b: any) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
      );

      // Compute stats
      const totalDeals = sorted.length;
      const topCompany = sorted[0]?.companyName || "—";

      setDeals(sorted);
      setStats({ totalDeals, topCompany });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("M&A fetch error:", error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDeals(query);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 py-10">
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-2">M&amp;A Tracker</h1>
      <p className="text-center text-gray-600 mb-4">
        Real-time mergers & acquisitions — view acquirers, targets, and filings,
        powered by{" "}
        <span className="text-yellow-600 font-semibold">WallStreetStocks.ai</span>.
        <br />
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated || "—"}
        </span>
      </p>

      {/* Back to Features Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => router.push("/features")}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-yellow-50 text-gray-700 font-medium px-5 py-2 rounded-full shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </button>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex items-center justify-center gap-3 mb-8"
      >
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by company name (e.g. Microsoft)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-yellow-400 outline-none text-gray-700"
          />
        </div>
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded-full shadow transition"
        >
          Search
        </button>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Total Deals</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {stats.totalDeals.toLocaleString()}
          </h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Latest Acquirer</p>
          <h2 className="text-2xl font-bold text-gray-900">{stats.topCompany}</h2>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow border border-gray-100 rounded-2xl">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-gray-700">
            <tr>
              <th className="py-3 px-4">Acquirer</th>
              <th className="py-3 px-4">Target</th>
              <th className="py-3 px-4">Symbol</th>
              <th className="py-3 px-4 text-right">Date</th>
              <th className="py-3 px-4 text-right">Filing</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  Loading deals...
                </td>
              </tr>
            )}
            {!loading && deals.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  No recent deals found.
                </td>
              </tr>
            )}
            {!loading &&
              deals.map((d, i) => (
                <tr key={i} className="border-t hover:bg-yellow-50">
                  <td className="py-3 px-4 font-medium">{d.companyName}</td>
                  <td className="py-3 px-4">{d.targetedCompanyName}</td>
                  <td className="py-3 px-4">{d.symbol || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    {d.transactionDate
                      ? new Date(d.transactionDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.link ? (
                      <a
                        href={d.link}
                        target="_blank"
                        className="text-yellow-600 hover:underline"
                      >
                        SEC Filing
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mt-8 text-center">
        <strong>Disclaimer:</strong> Market data is for informational purposes
        only. WallStreetStocks.ai does not provide investment advice.
      </p>
    </div>
  );
}
