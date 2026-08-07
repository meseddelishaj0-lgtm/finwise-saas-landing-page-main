"use client";

import React from "react";
import Reveal from "@/components/ui/Reveal";

// Trust band — stat tiles in the terminal aesthetic (replaced the old
// third-party ticker widget).

const STATS = [
  { value: "10K+", label: "Active Investors" },
  { value: "200+", label: "Hedge Funds & RIAs" },
  { value: "1M+", label: "Data Points Daily" },
  { value: "24/7", label: "AI Market Coverage" },
];

const Logos: React.FC = () => {
  return (
    <section
      id="logos"
      className="relative py-20 md:py-24 px-5 text-center bg-night text-white overflow-hidden"
    >
      <div className="section-glow" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-xl md:text-2xl font-semibold text-gray-100 tracking-tight">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent font-extrabold">
              200+
            </span>{" "}
            Hedge Funds & RIAs worldwide
          </p>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Empowering every investor with AI-driven research, analytics, and
            market intelligence to deliver consistent alpha.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="card-night group px-6 py-7 hover:border-yellow-400/40 transition-all duration-300">
                <p className="font-mono text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent tabular-nums">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-gray-400">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Logos;
