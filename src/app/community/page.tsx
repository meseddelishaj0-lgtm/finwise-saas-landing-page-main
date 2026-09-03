"use client";

import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const SPACES = [
  {
    idx: "01",
    title: "Discussion forums",
    body: "Talk through market trends, AI forecasts, and investing ideas with people watching the same names.",
    href: "/community/forums",
    cta: "Open forums",
  },
  {
    idx: "02",
    title: "Market rooms",
    body: "Focused rooms for stocks, crypto, real estate, and the macro picture, updated daily.",
    href: "/community/rooms",
    cta: "Open rooms",
  },
  {
    idx: "03",
    title: "Member network",
    body: "Build relationships, share research, and grow your standing among serious investors.",
    href: "/community/members",
    cta: "Meet members",
  },
];

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <CommandLine cmd="COM" note="investors on the same tape" className="mb-4" />
              <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
                Same market, <em className="italic text-gold-soft">more</em> eyes.
              </h1>
              <p className="mt-5 text-lg text-gray-300 max-w-2xl">
                Forums, live rooms, and a member network for investors, traders,
                and researchers who read the same tape you do.
              </p>
            </div>
            <Link href="/dashboard" className="btn-ghost-gold px-4 py-2 text-sm shrink-0 self-start md:self-auto">
              Back to dashboard
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {SPACES.map((s, i) => (
            <Reveal key={s.href} delay={0.06 + i * 0.06} className="h-full">
              <Link
                href={s.href}
                className="group card-night card-hover p-6 md:p-8 flex flex-col h-full"
              >
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {s.idx}
                </span>
                <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{s.title}</h2>
                <p className="mt-3 text-gray-400 leading-relaxed flex-1">{s.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold-soft">
                  {s.cta} <span className="arrow">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
