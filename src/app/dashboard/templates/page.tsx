"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-lg">
        Loading portfolio templates...
      </div>
    );
  }

  const portfolios = [
    {
      title: "Conservative Portfolio",
      description:
        "Low-risk strategy focused on capital preservation. Ideal for investors seeking stable returns through bonds, blue-chip dividend stocks, and cash equivalents.",
      allocation: "60% Bonds | 30% Stocks | 10% Cash",
    },
    {
      title: "Balanced Portfolio",
      description:
        "Moderate-risk portfolio blending growth and income. Designed for investors aiming for long-term steady growth with moderate volatility.",
      allocation: "60% Stocks | 30% Bonds | 10% Alternatives",
    },
    {
      title: "Growth Portfolio",
      description:
        "Aggressive strategy targeting maximum capital appreciation. Focused on technology, emerging markets, and high-growth equities.",
      allocation: "85% Stocks | 10% Bonds | 5% Crypto/Alternatives",
    },
  ];

  return (
    <div className="min-h-screen bg-night">
      {/* Header */}
      <header className="bg-surface shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-semibold text-ivory cursor-pointer"
          >
            WallStreetStocks
          </h1>

          <div className="flex items-center gap-4">
            <p className="text-gray-300">
              Welcome,{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email}
              </span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-yellow-400 hover:bg-gold text-black px-5 py-2 rounded-full font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        <div className="bg-surface p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-ivory">
            Beginner Portfolio Templates
          </h2>
          <p className="text-gray-400">
            Choose from pre-built investment templates designed by AI for your goals and risk level.
          </p>
        </div>

        {/* Portfolio Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((p, index) => (
            <div
              key={index}
              className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold mb-2 text-ivory">{p.title}</h3>
                <p className="text-gray-400 mb-4">{p.description}</p>
                <p className="text-sm text-gray-300 font-medium bg-gold/15 px-3 py-1 rounded-full inline-block">
                  {p.allocation}
                </p>
              </div>

              <button
                onClick={() => alert(`Loading ${p.title}...`)}
                className="mt-6 bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full transition-all"
              >
                View Template →
              </button>
            </div>
          ))}
        </section>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-yellow-400 hover:bg-gold text-black font-semibold py-3 px-10 rounded-full transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
