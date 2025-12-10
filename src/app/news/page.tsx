"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Search, RefreshCcw } from "lucide-react";

interface NewsArticle {
  title: string;
  site: string;
  text: string;
  url: string;
  image: string;
  publishedDate: string;
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
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 py-10 px-6 flex flex-col items-center">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <Newspaper className="text-yellow-400" /> U.S. Market News
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Stay up-to-date with real-time stock market headlines, breaking economy
        updates, and AI-curated insights from WallStreetStocks.ai.
      </p>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="flex items-center bg-white shadow-sm rounded-full border border-gray-200 px-4 py-2 w-full md:w-80">
          <Search className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search tickers or keywords (e.g. AAPL, inflation)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow outline-none text-sm text-gray-700"
          />
        </div>
        <button
          onClick={() => fetchNews()}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {["general", "stocks", "economy", "crypto"].map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              category === cat
                ? "bg-yellow-400 text-black shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* News Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {loading ? (
          <p className="text-gray-500 text-center col-span-full">
            Fetching latest headlines...
          </p>
        ) : news.length === 0 ? (
          <p className="text-gray-500 text-center col-span-full">
            No news available.
          </p>
        ) : (
          news.map((article, idx) => (
            <motion.a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all"
            >
              {article.image && (
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-44 w-full object-cover"
                />
              )}
              <div className="p-4 flex flex-col justify-between flex-grow">
                <h2 className="font-semibold text-gray-900 text-base mb-2">
                  {article.title}
                </h2>
                <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                  {article.text}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{article.site}</span>
                  <span>
                    {new Date(article.publishedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.a>
          ))
        )}
      </div>
    </main>
  );
};

export default NewsPage;
