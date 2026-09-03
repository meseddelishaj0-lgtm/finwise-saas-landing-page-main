"use client";

import React, { useEffect, useRef, useState } from "react";
import Reveal from "@/components/ui/Reveal";

// Coverage statusline — one quiet hairline band of platform numbers, set in
// the terminal's mono voice. Numbers count up the first time they scroll in.

type Stat =
  | { label: string; value: number; format: (n: number) => string }
  | { label: string; text: string };

const STATS: Stat[] = [
  { label: "Investors on the desk", value: 10_000, format: (n) => `${Math.round(n / 1000)}K+` },
  { label: "Funds & RIAs", value: 200, format: (n) => `${Math.round(n)}+` },
  {
    label: "Datapoints daily",
    value: 1_000_000,
    format: (n) => (n >= 1_000_000 ? "1M+" : `${Math.round(n / 1000)}K`),
  },
  { label: "AI market coverage", text: "24/7" },
];

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const CountUp: React.FC<{ value: number; format: (n: number) => string }> = ({ value, format }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1400;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          setN(value * easeOutExpo(p));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{format(n)}</span>;
};

const Logos: React.FC = () => {
  return (
    <section id="logos" className="relative w-full bg-night text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-16">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 border-y border-white/10 divide-x divide-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="px-5 md:px-8 py-7 [&:nth-child(3)]:border-l-0 md:[&:nth-child(3)]:border-l">
                <p className="font-monodata text-3xl md:text-4xl text-ivory tabular-nums">
                  {"text" in s ? s.text : <CountUp value={s.value} format={s.format} />}
                </p>
                <p className="mt-2 eyebrow">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Logos;
