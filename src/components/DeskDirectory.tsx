"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import CommandLine from "@/components/ui/CommandLine";

// Directory of the real product surfaces — replaces the old template
// testimonials. Every row is a working destination, indexed like a
// terminal function list.

const SURFACES = [
  {
    code: "TRM",
    name: "Trading Terminal",
    desc: "Live quotes and terminal-grade charts for any symbol.",
    href: "/terminal",
  },
  {
    code: "PIC",
    name: "AI Stock Picks",
    desc: "Model-selected stocks with the reasoning attached.",
    href: "/ai-stock-picks",
  },
  {
    code: "SCR",
    name: "Stock Screener",
    desc: "Filter the whole market down to your shortlist.",
    href: "/screener",
  },
  {
    code: "MAP",
    name: "Market Heatmap",
    desc: "The day's winners and losers at a glance.",
    href: "/heatmap",
  },
  {
    code: "AIA",
    name: "AI Assistant",
    desc: "Ask the desk anything — tickers, filings, concepts.",
    href: "/ai-assistant",
  },
  {
    code: "CAL",
    name: "Market Calendar",
    desc: "Earnings, dividends, IPOs, and economic events.",
    href: "/calendars",
  },
  {
    code: "VAL",
    name: "Valuation Models",
    desc: "DCF and multiples, computed for you.",
    href: "/valuation-models",
  },
  {
    code: "COM",
    name: "Community",
    desc: "Rooms and forums with investors on the same tape.",
    href: "/community/forums",
  },
];

const DeskDirectory: React.FC = () => {
  return (
    <section
      id="directory"
      className="relative w-full text-white bg-night border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <Reveal>
          <CommandLine cmd="DIR" note="everything on the desk" className="mb-4" />
          <h2 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            One login. The whole desk.
          </h2>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-2 border-t border-white/10">
          {SURFACES.map((s, i) => (
            <Link
              key={s.code}
              href={s.href}
              className={`group flex items-baseline gap-5 px-2 md:px-4 py-6 border-b border-white/10 transition-colors hover:bg-white/[0.02] ${
                i % 2 === 0 ? "md:border-r md:border-r-white/10" : ""
              }`}
            >
              <span className="font-monodata text-xs font-semibold text-gold tracking-widest w-10 flex-shrink-0">
                {s.code}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display text-xl md:text-2xl text-ivory group-hover:text-gold-soft transition-colors">
                  {s.name}
                </span>
                <span className="block mt-1 text-[15px] text-gray-400">{s.desc}</span>
              </span>
              <span className="arrow font-monodata text-gray-500 group-hover:text-gold transition-colors duration-300">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeskDirectory;
