"use client";
import React, { useEffect, useState } from "react";
import Script from "next/script";

const StockSearch: React.FC = () => {
  const [symbol, setSymbol] = useState("AAPL");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem("symbol") as HTMLInputElement).value.toUpperCase();
    setSymbol(input);
  };

  // initialize TradingView when script loads
  const initTradingView = () => {
    if (!(window as any).TradingView) return;
    new (window as any).TradingView.widget({
      width: "100%",
      height: 600,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      container_id: "tradingview_chart",
    });
  };

  // re-render chart when symbol changes
  useEffect(() => {
    if ((window as any).TradingView) initTradingView();
  }, [symbol]);

  return (
    <section className="w-full py-20 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4 text-gray-900">
          🔎 AI Stock Dashboard
        </h2>
        <p className="text-gray-600 mb-8">
          Search any stock and explore AI-driven research, performance charts, and key metrics.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex justify-center mb-10">
          <input
            type="text"
            name="symbol"
            placeholder="Enter Stock Symbol (e.g. TSLA)"
            className="border border-gray-300 rounded-l-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        {/* TradingView Container */}
        <div className="tradingview-widget-container h-[600px]">
          <div id="tradingview_chart" className="h-full"></div>
        </div>

        {/* TradingView Script */}
        <Script
          src="https://s3.tradingview.com/tv.js"
          strategy="afterInteractive"
          onReady={initTradingView}
        />
      </div>
    </section>
  );
};

export default StockSearch;

