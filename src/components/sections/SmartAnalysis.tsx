"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

const SmartAnalysis: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || containerRef.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.innerHTML = `
    {
      "lineWidth": 2,
      "chartType": "area",
      "colorTheme": "dark",
      "backgroundColor": "#0F0F0F",
      "fontColor": "#DBDBDB",
      "gridLineColor": "rgba(242, 242, 242, 0.06)",
      "volumeUpColor": "rgba(34, 171, 148, 0.5)",
      "volumeDownColor": "rgba(247, 82, 95, 0.5)",
      "upColor": "#22ab94",
      "downColor": "#f7525f",
      "isTransparent": false,
      "locale": "en",
      "symbols": [
        ["Apple", "NASDAQ:AAPL|1D"],
        ["Google", "NASDAQ:GOOGL|1D"],
        ["Microsoft", "NASDAQ:MSFT|1D"]
      ],
      "dateRanges": [
        "1d|1",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ],
      "autosize": true,
      "height": "400",
      "width": "100%"
    }`;
    containerRef.current.appendChild(script);
  }, []);

  return (
    <section className="bg-gradient-to-b from-black via-neutral-900 to-black py-24 text-white relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-8 relative z-10">
        {/* TradingView Widget */}
        <div
          ref={containerRef}
          className="w-full md:w-1/2 h-[400px] rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.2)] overflow-hidden"
        >
          <div className="tradingview-widget-container__widget"></div>
        </div>

        {/* Text */}
        <div className="w-full md:w-1/2 text-center md:text-left mt-10 md:mt-0">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Smart Analysis
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-xl mx-auto md:mx-0">
            Experience real-time market intelligence powered by{" "}
            <span className="text-yellow-400 font-semibold">WallStreetStocks AI</span>.  
            Analyze stocks like Apple, Google, and Microsoft — all in one dynamic view.
          </p>
          <Link
            href="/ai-dashboard"
            className="bg-yellow-400 text-black px-7 py-3 rounded-full font-semibold hover:bg-yellow-500 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all"
          >
            Explore AI Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SmartAnalysis;
