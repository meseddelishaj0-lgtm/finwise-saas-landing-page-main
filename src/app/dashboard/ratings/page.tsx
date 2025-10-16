"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RatingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading AI Ratings...
      </div>
    );
  }

  // 🧠 Mock AI Data — Replace with your API or database data later
  const aiRatings = [
    {
      ticker: "AAPL",
      company: "Apple Inc.",
      aiScore: 9.2,
      rating: "Strong Buy",
      growth: "+14.3%",
      valuation: "Undervalued",
    },
    {
      ticker: "NVDA",
      company: "NVIDIA Corporation",
      aiScore: 8.8,
      rating: "Buy",
      growth: "+19.7%",
      valuation: "Fair Value",
    },
    {
      ticker: "TSLA",
      company: "Tesla Inc.",
      aiScore: 7.1,
      rating: "Hold",
      growth: "+6.2%",
      valuation: "Overvalued",
    },
    {
      ticker: "AMZN",
      company: "Amazon.com Inc.",
      aiScore: 8.3,
      rating: "Buy",
      growth: "+12.1%",
      valuation: "Fair Value",
    },
    {
      ticker: "META",
      company: "Meta Platforms Inc.",
      aiScore: 9.0,
      rating: "Strong Buy",
      growth: "+15.8%",
      valuation: "Undervalued",
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* Intro Section */}
        <div className="bg-white p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            📊 Fundamental AI Ratings
          </h2>
          <p className="text-gray-600">
            AI-powered analysis of top companies — combining fundamentals,
            valuation, and growth metrics into a single score.
          </p>
        </div>

        {/* Table Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-yellow-100 text-gray-800">
                <th className="px-4 py-3 text-sm font-semibold">Ticker</th>
                <th className="px-4 py-3 text-sm font-semibold">Company</th>
                <th className="px-4 py-3 text-sm font-semibold">AI Score</th>
                <th className="px-4 py-3 text-sm font-semibold">AI Rating</th>
                <th className="px-4 py-3 text-sm font-semibold">Growth</th>
                <th className="px-4 py-3 text-sm font-semibold">Valuation</th>
              </tr>
            </thead>
            <tbody>
              {aiRatings.map((stock, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-gray-50 transition-all"
                >
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {stock.ticker}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{stock.company}</td>
                  <td className="px-4 py-3 font-semibold">{stock.aiScore}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      stock.rating === "Strong Buy"
                        ? "text-green-600"
                        : stock.rating === "Buy"
                        ? "text-blue-600"
                        : stock.rating === "Hold"
                        ? "text-yellow-600"
                        : "text-gray-600"
                    }`}
                  >
                    {stock.rating}
                  </td>
                  <td className="px-4 py-3 text-green-600 font-medium">
                    {stock.growth}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      stock.valuation === "Undervalued"
                        ? "text-green-600"
                        : stock.valuation === "Overvalued"
                        ? "text-red-600"
                        : "text-gray-700"
                    }`}
                  >
                    {stock.valuation}
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
