"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading weekly reports...
      </div>
    );
  }

  const reports = [
    {
      title: "U.S. Tech Sector Outlook – Q4 2025",
      summary:
        "AI models indicate renewed growth momentum in major U.S. tech firms following interest rate stabilization and increased semiconductor demand.",
      category: "Technology",
      date: "October 7, 2025",
      link: "#",
    },
    {
      title: "Energy & Commodities: Supply Constraints Ahead",
      summary:
        "AI signals tightening oil and copper supply, with high volatility expected as OPEC+ cuts align with green transition spending.",
      category: "Energy",
      date: "October 4, 2025",
      link: "#",
    },
    {
      title: "Global Real Estate Risk Index Update",
      summary:
        "Our risk model detects softening residential prices in Europe and elevated risk in U.S. commercial property amid rate uncertainty.",
      category: "Real Estate",
      date: "September 30, 2025",
      link: "#",
    },
    {
      title: "AI Stock Sentiment – Top 10 Movers",
      summary:
        "AAPL, NVDA, and MSFT lead positive sentiment scores while consumer discretionary stocks show mixed signals after Q3 earnings.",
      category: "Equities",
      date: "September 28, 2025",
      link: "#",
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
        {/* Header Card */}
        <div className="bg-white p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            📅 Weekly Research Reports
          </h2>
          <p className="text-gray-600">
            Explore premium AI-generated reports on markets, sectors, and global trends.
          </p>
        </div>

        {/* Reports Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reports.map((report, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                    {report.category}
                  </span>
                  <span className="text-xs text-gray-500">{report.date}</span>
                </div>

                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {report.title}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">{report.summary}</p>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => alert("Downloading PDF...")}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full text-sm transition-all"
                >
                  📄 Download PDF
                </button>
                <button
                  onClick={() => alert("Opening full report...")}
                  className="text-gray-600 hover:text-yellow-600 text-sm font-medium"
                >
                  View Full Report →
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-10 rounded-full transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
