"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

export default function StartupFundamentalsPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/startup-fundamentals");
      const data = await res.json();
      if (Array.isArray(data)) {
        setModules(data);
      } else {
        console.error("Invalid modules response:", data);
      }
    } catch (err) {
      console.error("Fetch modules error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="BIZ" note="startup fundamentals" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            {"Startup fundamentals"}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            {"A structured guide to launching, funding and scaling your startup — designed for entrepreneurs and business builders."}
          </p>
        </Reveal>

        {/* Modules */}
        <div className="mt-12 grid gap-6">
          {loading ? (
            <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Loading modules…
            </p>
          ) : modules.length === 0 ? (
            <p className="text-gray-500">{"No modules available at this time."}</p>
          ) : (
            modules.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.06}>
                <Link
                  href={m.link}
                  className="card-night card-hover group flex flex-col p-6 md:flex-row md:items-center md:justify-between md:gap-8"
                >
                  <div>
                    <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                      Module {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mt-3 text-lg md:text-xl font-semibold text-ivory">{m.title}</h2>
                    <p className="mt-2 text-gray-400 leading-relaxed">{m.description}</p>
                  </div>
                  <span className="mt-5 shrink-0 font-monodata text-[11px] uppercase tracking-widest text-gold-soft md:mt-0">
                    Open module <span className="arrow">→</span>
                  </span>
                </Link>
              </Reveal>
            ))
          )}
        </div>

        {/* Community */}
        <Reveal className="mt-20">
          <div className="card-night border-gold/30 p-8 md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  Community
                </p>
                <h2 className="mt-3 font-display text-ivory text-3xl md:text-5xl tracking-tight">
                  {"Ready to build your startup?"}
                </h2>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  {"Join WallStreetStocks’ entrepreneurship community for live workshops, founder interviews and startup funding strategies."}
                </p>
              </div>
              <Link href="/register" className="btn-gold shrink-0">
                Join the community
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <Link
            href="/resources/business-entrepreneurship"
            className="btn-ghost-gold px-5 py-2.5 text-sm"
          >
            ← Back to business &amp; entrepreneurship
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
