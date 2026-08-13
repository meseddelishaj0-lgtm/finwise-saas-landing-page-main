"use client";

import React from "react";
import Reveal from "@/components/ui/Reveal";

// Coverage statusline — one quiet hairline band of platform numbers,
// set in the terminal's mono voice.

const STATS = [
  { value: "10K+", label: "Investors on the desk" },
  { value: "200+", label: "Funds & RIAs" },
  { value: "1M+", label: "Datapoints daily" },
  { value: "24/7", label: "AI market coverage" },
];

const Logos: React.FC = () => {
  return (
    <section
      id="logos"
      className="relative w-screen bg-night text-white"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-16">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 border-y border-white/10 divide-x divide-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="px-5 md:px-8 py-7">
                <p className="font-monodata text-3xl md:text-4xl text-ivory tabular-nums">
                  {s.value}
                </p>
                <p className="mt-2 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Logos;
