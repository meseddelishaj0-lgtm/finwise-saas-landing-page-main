"use client";

import React from "react";
import { FnPanel, Loading, Empty, useJson } from "./ui";

// CN (company news) and TOP (market-wide headlines).

interface NewsItem {
  symbol?: string;
  title: string;
  site: string;
  url: string;
  publishedDate: string;
  text?: string;
  image?: string;
}

const ago = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d.replace(" ", "T")).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
};

const NewsPanel: React.FC<{ symbol?: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const url = symbol ? `/api/market/news?symbol=${encodeURIComponent(symbol.replace("^", ""))}` : "/api/market/news";
  const { data, loading } = useJson<NewsItem[]>(url, 120_000);
  const items = Array.isArray(data) ? data : [];

  return (
    <FnPanel
      code={symbol ? "CN" : "TOP"}
      title={symbol ? `${symbol.replace("^", "")} News` : "Top Market News"}
      subtitle="Refreshes every 2 minutes"
    >
      {loading && !data ? (
        <Loading rows={10} />
      ) : !items.length ? (
        <Empty text="No recent headlines." />
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((n, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 hover:bg-white/[0.03]">
              <span className="w-10 flex-shrink-0 pt-0.5 font-mono text-[11px] text-yellow-300/80">{ago(n.publishedDate)}</span>
              <div className="min-w-0 flex-1">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-100 hover:text-yellow-300 leading-snug">
                  {n.title}
                </a>
                {n.text && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{n.text}</p>}
                <p className="mt-1 text-[11px] text-gray-600">
                  {n.site}
                  {n.symbol && !symbol && (
                    <button onClick={() => onSelect(n.symbol!)} className="ml-2 px-1.5 py-0.5 rounded border border-white/10 font-mono font-bold text-gray-400 hover:text-yellow-300">
                      {n.symbol}
                    </button>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </FnPanel>
  );
};

export default NewsPanel;
