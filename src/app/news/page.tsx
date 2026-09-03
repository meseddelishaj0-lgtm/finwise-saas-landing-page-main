"use client";

import React, { useEffect, useState } from "react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface NewsArticle {
  title: string;
  site: string;
  text: string;
  url: string;
  image: string;
  publishedDate: string;
}

const CATEGORIES = ["general", "stocks", "economy", "crypto"];

const pillClass = (active: boolean) =>
  `px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider border transition-colors ${
    active
      ? "bg-gold/10 text-gold border-gold/30"
      : "text-gray-500 hover:text-gray-200 border-transparent"
  }`;

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin >= 0 && diffMin < 60) return `${Math.max(diffMin, 1)}m ago`;
  if (diffMin >= 0 && diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const NewsPage = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("general");

  const fetchNews = async (customQuery?: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: customQuery ?? query }),
      });
      const { data } = await res.json();
      setNews(data || []);
    } catch (err) {
      console.error("Error fetching news:", err);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategory = (cat: string) => {
    setCategory(cat);
    let q = "";
    if (cat === "crypto") q = "BTC,ETH";
    else if (cat === "economy") q = "SPY,DIA,QQQ";
    else if (cat === "stocks") q = "AAPL,MSFT,NVDA,TSLA,AMZN";
    fetchNews(q);
  };

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="TOP" note="top market news" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            On the <em className="italic text-gold-soft">wire</em>.
          </h1>
          <p className="mt-5 text-lg text-gray-300 max-w-2xl">
            Headlines across stocks, the economy, and crypto, pulled live and
            sorted newest first.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-12">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              placeholder="Search tickers or keywords, e.g. AAPL or inflation"
              aria-label="Search news"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchNews()}
              className="w-full md:w-96 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
            <button
              type="button"
              onClick={() => fetchNews()}
              disabled={loading}
              className="btn-ghost-gold px-4 py-2 text-sm shrink-0 self-start md:self-auto disabled:opacity-60 disabled:pointer-events-none"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={category === cat}
                onClick={() => handleCategory(cat)}
                className={pillClass(category === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10">
          {loading ? (
            <p className="text-gray-500">Fetching the latest headlines.</p>
          ) : news.length === 0 ? (
            <p className="text-gray-500">No news available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {news.map((article, idx) => (
                <Reveal key={`${article.url}-${idx}`} delay={Math.min(idx, 8) * 0.06} className="h-full">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group card-night card-hover overflow-hidden flex flex-col h-full"
                  >
                    {article.image && (
                      <img
                        src={article.image}
                        alt=""
                        loading="lazy"
                        className="aspect-video w-full object-cover bg-surface2"
                      />
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                        {article.site}
                        {formatWhen(article.publishedDate) && (
                          <> · {formatWhen(article.publishedDate)}</>
                        )}
                      </p>
                      <h2 className="mt-2 text-base md:text-lg font-semibold text-ivory leading-snug">
                        {article.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-400 leading-relaxed line-clamp-2">
                        {article.text}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold-soft">
                        Read <span className="arrow">→</span>
                      </span>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default NewsPage;
