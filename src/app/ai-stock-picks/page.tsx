"use client";

import React, { useState } from "react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface StockPick {
  symbol: string;
  name: string;
  sector: string;
  rationale: string;
  sentiment: string;
}

const THEMES = ["growth", "value", "momentum"] as const;

const inputClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

const pillClass = (active: boolean) =>
  `px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider border transition-colors ${
    active
      ? "bg-gold/10 text-gold border-gold/30"
      : "text-gray-500 hover:text-gray-200 border-transparent"
  }`;

function sentimentClass(sentiment: string) {
  const s = (sentiment || "").toLowerCase();
  if (s === "bullish") return "bg-gold/10 text-gold border-gold/30";
  if (s === "bearish") return "bg-white/[0.04] text-gray-300 border-white/15";
  return "bg-white/[0.02] text-gray-500 border-white/10";
}

export default function AIStockPicksPage() {
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("growth");
  const [sector, setSector] = useState("");
  const [query, setQuery] = useState("");

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai-stock-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, sector }),
      });
      const { data } = await res.json();
      setPicks(data || []);
    } catch (err) {
      console.error("Error fetching AI picks:", err);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  const visible = picks.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.symbol.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="PIC" note="model-selected stocks" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Picks with the <em className="italic text-gold-soft">reasoning</em> attached.
          </h1>
          <p className="mt-5 text-lg text-gray-300 max-w-2xl">
            Growth, value, or momentum. The model screens the tape and explains
            every name it puts forward.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-12">
          {/* Strategy */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500 mr-2">
              Strategy
            </span>
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                className={pillClass(theme === t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sector + generate */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              placeholder="Sector (optional), e.g. Technology or Energy"
              aria-label="Sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && fetchPicks()}
              className={`${inputClass} w-full sm:w-96`}
            />
            <button
              type="button"
              onClick={fetchPicks}
              disabled={loading}
              className="btn-gold px-5 py-2.5 text-sm shrink-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? "Generating" : "Generate picks"}
            </button>
          </div>

          {/* Filter */}
          {picks.length > 0 && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Filter by company or ticker"
                aria-label="Filter picks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass} w-full sm:w-96`}
              />
            </div>
          )}
        </Reveal>

        {/* Results */}
        <div className="mt-10">
          {loading ? (
            <p className="text-gray-500">Generating picks from the model.</p>
          ) : picks.length === 0 ? (
            <p className="text-gray-500">
              Choose a strategy and generate picks to see the names the model puts forward.
            </p>
          ) : (
            <>
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500 mb-4">
                {visible.length} of {picks.length} picks · {theme}
                {sector.trim() ? ` · ${sector.trim()}` : ""}
              </p>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((p, i) => (
                  <Reveal key={`${p.symbol}-${i}`} delay={Math.min(i, 8) * 0.06}>
                    <article className="card-night p-5 md:p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-monodata tabular-nums text-lg md:text-xl font-semibold text-ivory">
                          {p.symbol}
                        </h3>
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-md border font-monodata text-[10px] uppercase tracking-widest ${sentimentClass(
                            p.sentiment
                          )}`}
                        >
                          {p.sentiment}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-300 font-medium">{p.name}</p>
                      <p className="mt-2 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                        {p.sector}
                      </p>
                      <p className="mt-4 text-sm text-gray-400 leading-relaxed">{p.rationale}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
              {visible.length === 0 && (
                <p className="text-gray-500">No picks match that filter.</p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
