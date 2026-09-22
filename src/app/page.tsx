import Logos from "@/components/Logos";
import Benefits from "@/components/Benefits/Benefits";
import CTA from "@/components/CTA";
import Pricing from "@/components/Pricing/Pricing";
import Reveal from "@/components/ui/Reveal";
import CommandLine from "@/components/ui/CommandLine";
import TickerTape from "@/components/market/TickerTape";
import TerminalHero from "@/components/market/TerminalHero";
import MarketsBoard from "@/components/market/MarketsBoard";
import NewsAndTrending from "@/components/market/NewsAndTrending";
import DeskDirectory from "@/components/DeskDirectory";

const FAQS = [
  {
    q: "Is WallStreetStocks secure?",
    a: "Yes. Connections are encrypted end to end, sessions are protected with modern authentication, and activity is monitored in real time.",
  },
  {
    q: "Can I use it on multiple devices?",
    a: "Yes. Sign in from desktop, tablet, or the iOS app — your watchlists, portfolios, and settings stay in sync.",
  },
  {
    q: "How do memberships work?",
    a: "Pick Gold, Platinum, or Diamond and the desk unlocks accordingly. Upgrade, downgrade, or cancel any time from your account.",
  },
  {
    q: "Do I need research experience?",
    a: "No. The AI turns filings, fundamentals, and price action into plain-English briefs, ratings, and visual dashboards built for every level.",
  },
  {
    q: "What if I need help?",
    a: "Email wallstreetstocks@outlook.com and a human answers — account questions, billing, or anything on the platform.",
  },
];

const HomePage: React.FC = () => {
  return (
    <>
      {/* The tape opens the session (layout <main> already clears the fixed header) */}
      <TickerTape />

      {/* Masthead + live terminal pane */}
      <TerminalHero />

      {/* WEI — live markets board */}
      <MarketsBoard />

      {/* TOP — market news + trending */}
      <NewsAndTrending />

      {/* Coverage statusline */}
      <Logos />

      {/* DES — what the desk does */}
      <Benefits />

      {/* SUB — membership plans */}
      <section
        id="plans"
        className="relative w-full text-white bg-night border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <Reveal>
            <CommandLine cmd="SUB" note="membership plans" className="mb-4" />
            <h2 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
              Choose your edge.
            </h2>
            <p className="mt-4 text-gray-300 max-w-2xl text-lg">
              Three tiers, one desk. Pay monthly, or go yearly and save
              33% — cancel anytime.
            </p>
          </Reveal>

          <Pricing />
        </div>
      </section>

      {/* DIR — the product index (replaces template testimonials) */}
      <DeskDirectory />

      {/* HELP — FAQ */}
      <section
        id="faq"
        className="relative w-full text-white bg-night border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
          <div>
            <CommandLine cmd="HELP" note="questions, answered" className="mb-4" />
            <h2 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
              Before you ask the desk.
            </h2>
            <p className="mt-5 text-gray-300 leading-relaxed">
              Anything not covered here reaches a human at{" "}
              <a
                href="mailto:wallstreetstocks@outlook.com"
                className="text-gold hover:text-gold-soft underline underline-offset-4 transition"
              >
                wallstreetstocks@outlook.com
              </a>
              .
            </p>
          </div>

          <div className="border-t border-white/10">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border-b border-white/10">
                <summary className="flex justify-between items-center gap-6 cursor-pointer list-none py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-xl md:text-2xl text-ivory group-hover:text-gold-soft transition-colors">
                    {faq.q}
                  </span>
                  <span className="font-monodata text-gold text-lg select-none group-open:rotate-45 transition-transform duration-300">
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-10 text-gray-300 text-[17px] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* GO — closing gold band */}
      <CTA />
    </>
  );
};

export default HomePage;
