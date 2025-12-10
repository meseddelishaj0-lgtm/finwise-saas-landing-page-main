"use client";

import React, { useEffect, useRef } from "react";

const TradingViewChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ""; // clear old script

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbol": "NASDAQ:AAPL",
        "interval": "W",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": true,
        "autosize": true,
        "backgroundColor": "#ffffff",
        "gridColor": "rgba(0,0,0,0.05)",
        "save_image": true,
        "compareSymbols": [
          { "symbol": "NASDAQ:TSLA", "position": "SameScale" },
          { "symbol": "NASDAQ:GOOG", "position": "SameScale" }
        ]
      }`;
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container w-full max-w-6xl mx-auto h-[600px] mt-10">
      <div
        ref={containerRef}
        className="tradingview-widget-container__widget w-full h-full rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
      />
      <div className="text-gray-400 text-sm mt-2 text-center">
        <a
          href="https://www.tradingview.com/symbols/NASDAQ-AAPL/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-500 hover:underline"
        >
          AAPL stock chart
        </a>{" "}
        <span>by WallStreetStocks</span>
      </div>
    </div>
  );
};

export default TradingViewChart;
