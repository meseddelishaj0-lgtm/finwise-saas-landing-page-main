import type { Metadata } from "next";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About WallStreetStocks.ai",
  description:
    "WallStreetStocks.ai is an AI-powered research desk: live market data, plain-English research, and a pro-grade terminal for every investor.",
};

const SECTIONS = [
  {
    idx: "01",
    title: "What we do",
    body: [
      "WallStreetStocks.ai is redefining how investors analyze the markets. Built on advanced AI and real-time data, the platform delivers deep financial insights, portfolio intelligence, and predictive analytics — helping investors make smarter, faster, and more confident decisions.",
      "Whether you're a retail investor, financial advisor, or hedge fund, you get institutional-grade tools that uncover opportunities before the market does. The system continuously scans thousands of equities, bonds, ETFs, and macro indicators to reveal valuation trends, sentiment shifts, and risk signals in seconds.",
    ],
  },
  {
    idx: "02",
    title: "Our mission",
    body: [
      "Our mission is simple: to democratize institutional-level market intelligence and make advanced investing tools accessible to everyone. We believe every investor deserves data-driven clarity — not noise.",
    ],
  },
  {
    idx: "03",
    title: "The technology",
    body: [
      "Powered by AI forecasting engines, sentiment models, and data from industry-leading sources, the platform transforms complex financial data into clear, actionable insights. From equity fundamentals and bond analytics to AI-driven macro forecasting — everything is built for precision and performance.",
    ],
  },
  {
    idx: "04",
    title: "Join the future of investing",
    body: [
      "WallStreetStocks.ai is trusted by thousands of investors, advisors, and professionals across the world. Whether you're just starting or managing millions, the desk gives you the competitive edge to stay ahead of the market.",
    ],
  },
];

const AboutPage = () => {
  return (
    <main className="min-h-screen bg-night text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="DES" note="about the desk" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Built so the market reads{" "}
            <em className="italic text-gold-soft">with</em> you.
          </h1>
          <p className="mt-5 text-gray-400 max-w-2xl text-lg leading-relaxed">
            An AI research desk for every investor — live quotes, plain-English
            research, and a pro-grade terminal, without the desk job.
          </p>
        </Reveal>

        <div className="mt-16 border-t border-white/10">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.idx} delay={i * 0.05}>
              <section className="grid md:grid-cols-[180px_1fr] gap-4 md:gap-12 py-10 border-b border-white/10">
                <div className="flex items-baseline gap-3 md:block">
                  <span className="font-monodata text-[11px] text-gold">{s.idx}</span>
                  <h2 className="font-display text-2xl text-ivory md:mt-2">{s.title}</h2>
                </div>
                <div className="space-y-5 text-gray-300 leading-relaxed max-w-3xl">
                  {s.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link href="/register" className="btn-gold group px-8 py-3.5">
              Create free account
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/terminal" className="btn-ghost-gold px-8 py-3.5">
              Open the Terminal
            </Link>
            <span className="font-monodata text-xs text-gray-500 sm:ml-2">
              Questions? wallstreetstocks@outlook.com
            </span>
          </div>
        </Reveal>
      </div>
    </main>
  );
};

export default AboutPage;
