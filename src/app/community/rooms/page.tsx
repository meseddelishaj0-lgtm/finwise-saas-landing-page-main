"use client";

import { useRouter } from "next/navigation";

export default function MarketRoomsPage() {
  const router = useRouter();

  const rooms = [
    {
      title: "📈 Stock Market Room",
      description:
        "Join traders and investors to discuss daily market movements, earnings, and top stock opportunities.",
      color: "bg-blue-50",
      link: "/community/rooms/stocks",
    },
    {
      title: "💹 Crypto Room",
      description:
        "Stay updated on Bitcoin, Ethereum, and altcoin trends. Share your insights on blockchain and Web3.",
      color: "bg-purple-50",
      link: "/community/rooms/crypto",
    },
    {
      title: "🏠 Real Estate Room",
      description:
        "Talk about property investments, REITs, and rental strategies. Exchange ideas with real estate pros.",
      color: "bg-green-50",
      link: "/community/rooms/real-estate",
    },
    {
      title: "🌍 Macro Insights Room",
      description:
        "Analyze interest rates, inflation, and global economic shifts with other macro-focused investors.",
      color: "bg-yellow-50",
      link: "/community/rooms/macro",
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
            📊 Market Rooms
          </h1>
          <button
            onClick={() => router.push("/community")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all"
          >
            ← Back to Community
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-14 text-center">
        <h2 className="text-4xl font-bold mb-4 text-gray-900">Market Rooms</h2>
        <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
          Dive into focused market discussions. Join rooms tailored to your favorite assets and investment styles.
        </p>

        {/* Room Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <div
              key={room.title}
              className={`${room.color} rounded-2xl shadow-sm hover:shadow-md transition-all p-6 text-left cursor-pointer border border-gray-100`}
              onClick={() => router.push(room.link)}
            >
              <h3 className="text-xl font-semibold mb-2">{room.title}</h3>
              <p className="text-gray-600 mb-4">{room.description}</p>
              <button className="text-yellow-600 font-semibold hover:underline">
                Join Room →
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
