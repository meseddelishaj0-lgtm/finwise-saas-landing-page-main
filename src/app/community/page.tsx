"use client";

import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-night">
      {/* Header */}
      <header className="bg-surface shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1 className="text-2xl text-ivory font-display font-normal tracking-tight">
            WallStreetStocks Community
          </h1>
          <Link
            href="/dashboard"
            className="bg-yellow-400 hover:bg-gold text-black px-5 py-2 rounded-full font-medium transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-ivory">
          Join the WallStreetStocks Community </h2>
        <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
          Connect with investors, traders, and finance enthusiasts who share your passion 
          for markets, AI research, and financial freedom.
        </p>

        {/* Cards Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Discussion Forums */}
          <div className="bg-surface shadow-sm rounded-2xl p-8 hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-3">Discussion Forums</h3>
            <p className="text-gray-400 mb-6">
              Talk about the latest market trends, AI forecasts, and investing ideas 
              with like-minded people.
            </p>
            <Link
              href="/community/forums"
              className="text-gold font-semibold hover:underline"
            >
              Explore Forums →
            </Link>
          </div>

          {/* Market Rooms */}
          <div className="bg-surface shadow-sm rounded-2xl p-8 hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-3">Market Rooms</h3>
            <p className="text-gray-400 mb-6">
              Join focused rooms for stocks, crypto, real estate, and macro economy insights — 
              updated daily.
            </p>
            <Link
              href="/community/rooms"
              className="text-gold font-semibold hover:underline"
            >
              Join a Room →
            </Link>
          </div>

          {/* Member Network */}
          <div className="bg-surface shadow-sm rounded-2xl p-8 hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-3">Member Network</h3>
            <p className="text-gray-400 mb-6">
              Build relationships, share research, and grow your influence in the financial world.
            </p>
            <Link
              href="/community/members"
              className="text-gold font-semibold hover:underline"
            >
              Meet Members →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
