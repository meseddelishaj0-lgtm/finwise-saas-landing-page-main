"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function MarketRoomsPage() {
  const router = useRouter();

  const rooms = [
    {
      title: "Stock market room",
      description:
        "Join traders and investors to discuss daily market movements, earnings, and top stock opportunities.",
      link: "/community/rooms/stocks",
    },
    {
      title: "Crypto room",
      description:
        "Stay updated on Bitcoin, Ethereum, and altcoin trends. Share your insights on blockchain and Web3.",
      link: "/community/rooms/crypto",
    },
    {
      title: "Real estate room",
      description:
        "Talk about property investments, REITs, and rental strategies. Exchange ideas with real estate pros.",
      link: "/community/rooms/real-estate",
    },
    {
      title: "Macro insights room",
      description:
        "Analyze interest rates, inflation, and global economic shifts with other macro-focused investors.",
      link: "/community/rooms/macro",
    },
  ];

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <CommandLine cmd="ROO" note="focused market rooms" className="mb-4" />
              <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
                Market <em className="italic text-gold-soft">rooms</em>.
              </h1>
              <p className="mt-5 text-lg text-gray-300 max-w-2xl">
                Focused discussion by asset class. Pick the room that matches
                what you trade.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/community")}
              className="btn-ghost-gold px-4 py-2 text-sm shrink-0 self-start md:self-auto"
            >
              Back to community
            </button>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {rooms.map((room, i) => (
            <Reveal key={room.title} delay={0.06 + i * 0.06} className="h-full">
              <Link
                href={room.link}
                className="group card-night card-hover p-6 md:p-8 flex flex-col h-full"
              >
                <h2 className="text-lg md:text-xl font-semibold text-ivory">{room.title}</h2>
                <p className="mt-3 text-gray-400 leading-relaxed flex-1">{room.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold-soft">
                  Open room <span className="arrow">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
