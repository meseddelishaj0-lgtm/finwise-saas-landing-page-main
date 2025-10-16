"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AIPicksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading AI Stock Picks...
      </div>
    );
  }

  // Mock AI data (replace later with real AI or API results)
  const aiStockPicks = [
    {
      ticker: "NVDA",
      company: "NVIDIA Corporation",
      rating: "Strong Buy",
      aiScore: 9.6,
      priceTarget: "$620",
      sector: "Semiconductors",
    },
    {
      ticker: "AAPL",
      company: "Apple Inc.",
      rating: "Buy",
      aiScore: 8.9,
      priceTarget: "$215",
      sector: "Technology",
    },
    {
      ticker: "TSLA",
      company: "Tesla Inc.",
      rating: "Hold",
      aiScore: 7.8,
      priceTarget: "$285",
      sector: "EV & Clean Energy",
    },
    {
      ticker: "MSFT",
      company: "Microsoft Corporation",
      rating: "Strong Buy",
      aiScore: 9.4,
      priceTarget: "$450",
      sector: "Cloud Computing",
    },
    {
      ticker: "AMZN",
      company: "Amazon.com Inc.",
      rating: "Buy",
      aiScore: 8.7,
      priceTarget: "$190",
      sector: "E-Commerce",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-semibold text-gray-900 cursor-pointer"
          >
            🧠 WallStreetStocks
          </h1>

          <div className="flex items-center gap-4">
            <p className="text-gray-700">
              Welcome,{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email}
              </span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        <div className="bg-white p-10 rounded-2xl shadow-md mb-12 text-center">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            🤖 AI Stock Picks
          </h2>
          <p className="text-gray-600 mb-6">
            Daily AI-generated stock recommendations — ranked by our proprietary
            algorithm that analyzes fundamentals, sentiment, and trend momentum.
          </p>
        </div>

        {/* Table */}
        <div className="bg-white p-8 rounded-2xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-yellow-100 text-gray-800">
                <th className="px-4 py-3 text-sm font-semibold">Ticker</th>
                <th className="px-4 py-3 text-sm font-semibold">Company</th>
                <th className="px-4 py-3 text-sm font-semibold">Sector</th>
                <th className="px-4 py-3 text-sm font-semibold">AI Rating</th>
                <th className="px-4 py-3 text-sm font-semibold">AI Score</th>
                <th className="px-4 py-3 text-sm font-semibold">Price Target</th>
              </tr>
            </thead>
            <tbody>
              {aiStockPicks.map((stock, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-gray-50 transition-all"
                >
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {stock.ticker}
                  </td>
                  <td className="px-4 py-3">{stock.company}</td>
                  <td className="px-4 py-3 text-gray-600">{stock.sector}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      stock.rating === "Strong Buy"
                        ? "text-green-600"
                        : stock.rating === "Buy"
                        ? "text-blue-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {stock.rating}
                  </td>
                  <td className="px-4 py-3">{stock.aiScore}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {stock.priceTarget}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back Button */}
        <div className="mt-10 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 rounded-full font-semibold transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
