"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    let alive = true;
    fetch("/api/market/news")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setNews(d); })
      .catch(() => {});
    fetch("/api/market/movers?list=actives")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setActives(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const [lead, ...rest] = news;

  return (
    <section className="relative w-screen text-white bg-night pb-20" style={{ marginLeft: "calc(-50vw + 50%)" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Market News
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lead story + grid */}
          <div className="lg:col-span-2">
            {lead && (
              <a href={lead.url} target="_blank" rel="noopener noreferrer"
                className="group block card-night overflow-hidden hover:border-yellow-400/40 transition-colors duration-300">
                {lead.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lead.image} alt="" className="w-full h-64 md:h-80 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    {lead.symbol && (
                      <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-300 font-bold">{lead.symbol}</span>
                    )}
                    <span>{lead.site}</span>
                    <span>·</span>
                    <span>{timeAgo(lead.publishedDate)}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold leading-snug group-hover:text-yellow-200 transition-colors">
                    {lead.title}
                  </h3>
                  {lead.text && <p className="mt-2 text-gray-400 text-sm leading-relaxed line-clamp-2">{lead.text}…</p>}
                </div>
              </a>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {rest.slice(0, 6).map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="group flex gap-3 card-night rounded-xl p-3 hover:border-yellow-400/40 transition-colors duration-300">
                  {n.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
                      {n.symbol && <span className="text-yellow-400 font-bold">{n.symbol}</span>}
                      <span className="truncate">{n.site}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">{timeAgo(n.publishedDate)}</span>
                    </div>
                    <h4 className="text-sm font-semibold leading-snug line-clamp-3 group-hover:text-yellow-200 transition-colors">
                      {n.title}
                    </h4>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Trending tickers */}
          <div className="card-night overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <span className="text-yellow-400">🔥</span>
              <h3 className="text-sm font-bold">Trending Tickers</h3>
            </div>
            <div className="p-2">
              {actives.length === 0
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className="h-[46px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
                  ))
                : actives.slice(0, 10).map((m, idx) => {
                    const up = (m.changePercent || 0) >= 0;
                    return (
                      <Link key={m.symbol} href={`/terminal?symbol=${encodeURIComponent(m.symbol)}`}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-gray-500 font-mono text-xs w-4 tabular-nums">{idx + 1}</span>
                          <div className="min-w-0">
                            <span className="font-bold text-white text-sm">{m.symbol}</span>
                            <span className="block text-[11px] text-gray-500 truncate max-w-[150px]">{m.name}</span>
                          </div>
                        </div>
                        <span className={`font-mono tabular-nums text-xs font-bold ${up ? "text-green-400" : "text-red-400"}`}>
                          {up ? "+" : ""}{(m.changePercent || 0).toFixed(2)}%
                        </span>
                      </Link>
                    );
                  })}
            </div>
            <Link href="/terminal"
              className="block text-center py-3 border-t border-white/5 text-gray-400 text-sm font-semibold hover:text-yellow-300 hover:bg-white/[0.03] transition-colors">
              View in Terminal →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsAndTrending;
