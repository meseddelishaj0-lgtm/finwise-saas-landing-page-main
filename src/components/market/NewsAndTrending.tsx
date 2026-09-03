"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface NewsItem {
  symbol?: string;
  title: string;
  image?: string;
  site: string;
  url: string;
  publishedDate: string;
  text?: string;
}

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface DeskArticle {
  slug: string;
  title: string;
  summary: string | null;
  symbol: string | null;
  publishedAt: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr.replace(" ", "T")).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NewsAndTrending: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [actives, setActives] = useState<Mover[]>([]);
  const [desk, setDesk] = useState<DeskArticle[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/market/news")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d)) setNews(d);
      })
      .catch(() => {});
    fetch("/api/market/movers?list=actives")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d)) setActives(d);
      })
      .catch(() => {});
    fetch("/api/newsroom?limit=3")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d?.articles)) setDesk(d.articles);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [lead, ...rest] = news;

  return (
    <section className="relative w-full text-white bg-night pb-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <CommandLine cmd="TOP" note="top market news" className="mb-4" />
              <h2 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">On the wire</h2>
            </div>
            <Link
              href="/news"
              className="group hidden sm:inline-flex items-center gap-2 eyebrow hover:text-gold transition-colors"
            >
              All news <span className="arrow">→</span>
            </Link>
          </div>
        </Reveal>

        {/* From the desk — owner-published newsroom stories */}
        {desk.length > 0 && (
          <div className="mb-5 grid sm:grid-cols-3 gap-4">
            {desk.map((a, i) => (
              <Reveal key={a.slug} delay={i * 0.06} className="h-full">
                <Link href={`/newsroom/${a.slug}`} className="group card-night card-hover block h-full p-5">
                  <div className="flex items-center gap-2 eyebrow text-gold mb-3">
                    From the desk
                    {a.symbol && <span className="text-gray-500">· {a.symbol}</span>}
                    <span className="ml-auto text-gray-500 normal-case tracking-normal font-normal">
                      {timeAgo(a.publishedAt)}
                    </span>
                  </div>
                  <h3 className="font-display text-xl md:text-[1.35rem] text-ivory leading-snug line-clamp-2 group-hover:text-gold-soft transition-colors">
                    {a.title}
                  </h3>
                  {a.summary && (
                    <p className="mt-2 text-[15px] text-gray-400 leading-relaxed line-clamp-2">{a.summary}</p>
                  )}
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Lead story + grid */}
          <div className="lg:col-span-2">
            {lead && (
              <Reveal>
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block card-night card-hover overflow-hidden"
                >
                  {lead.image ? (
                    <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lead.image}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700 ease-expo"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                        <div className="flex items-center gap-2 eyebrow text-gray-300 mb-3">
                          {lead.symbol && (
                            <span className="px-2 py-0.5 rounded bg-gold/15 text-gold">{lead.symbol}</span>
                          )}
                          <span>{lead.site}</span>
                          <span>·</span>
                          <span>{timeAgo(lead.publishedDate)}</span>
                        </div>
                        <h3 className="font-display text-2xl md:text-[2rem] text-ivory leading-tight max-w-3xl group-hover:text-gold-soft transition-colors">
                          {lead.title}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-2 eyebrow mb-3">
                        {lead.symbol && (
                          <span className="px-2 py-0.5 rounded bg-gold/15 text-gold">{lead.symbol}</span>
                        )}
                        <span>{lead.site}</span>
                        <span>·</span>
                        <span>{timeAgo(lead.publishedDate)}</span>
                      </div>
                      <h3 className="font-display text-2xl md:text-3xl text-ivory leading-tight group-hover:text-gold-soft transition-colors">
                        {lead.title}
                      </h3>
                    </div>
                  )}
                  {lead.text && (
                    <p className="px-6 md:px-8 pb-6 md:pb-7 -mt-1 text-[15px] text-gray-400 leading-relaxed line-clamp-2">
                      {lead.text}…
                    </p>
                  )}
                </a>
              </Reveal>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {rest.slice(0, 6).map((n, i) => (
                <Reveal key={i} delay={(i % 2) * 0.05} className={i >= 4 ? "hidden sm:block" : ""}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-4 card-night card-hover p-3.5 h-full"
                  >
                    {n.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 eyebrow mb-1.5">
                        {n.symbol && <span className="text-gold">{n.symbol}</span>}
                        <span className="truncate normal-case tracking-normal">{n.site}</span>
                        <span>·</span>
                        <span className="whitespace-nowrap normal-case tracking-normal">{timeAgo(n.publishedDate)}</span>
                      </div>
                      <h4 className="text-[15px] font-semibold text-ivory leading-snug line-clamp-3 group-hover:text-gold-soft transition-colors">
                        {n.title}
                      </h4>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Trending tickers */}
          <Reveal delay={0.1}>
            <div className="card-night overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="eyebrow text-gold">Trending · most active</h3>
                <span className="eyebrow">Vol</span>
              </div>
              <div className="p-2">
                {actives.length === 0
                  ? [...Array(8)].map((_, i) => (
                      <div key={i} className="h-[46px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
                    ))
                  : actives.slice(0, 10).map((m, idx) => {
                      const up = (m.changePercent || 0) >= 0;
                      return (
                        <Link
                          key={m.symbol}
                          href={`/terminal?symbol=${encodeURIComponent(m.symbol)}`}
                          className={`${idx >= 6 ? "hidden sm:flex" : "flex"} items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-monodata text-gray-500 text-xs w-4 tabular-nums">{idx + 1}</span>
                            <div className="min-w-0">
                              <span className="font-monodata font-semibold text-ivory text-sm">{m.symbol}</span>
                              <span className="block text-[11px] text-gray-500 truncate max-w-[150px]">{m.name}</span>
                            </div>
                          </div>
                          <span className={`font-monodata tabular-nums text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                            {up ? "+" : ""}
                            {(m.changePercent || 0).toFixed(2)}%
                          </span>
                        </Link>
                      );
                    })}
              </div>
              <Link
                href="/terminal"
                className="group flex items-center justify-center gap-2 py-3 border-t border-white/10 eyebrow hover:text-gold hover:bg-white/[0.03] transition-colors"
              >
                View in Terminal <span className="arrow">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default NewsAndTrending;
