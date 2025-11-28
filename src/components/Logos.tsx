"use client";

import React, { useEffect, useRef } from "react";

const Logos: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || containerRef.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
      ],
      colorTheme: "dark",
      locale: "en",
      isTransparent: true,
      showSymbolLogo: true,
      displayMode: "adaptive",
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <section
      id="logos"
      className="relative py-28 px-5 text-center bg-gradient-to-b from-black via-zinc-900 to-black text-white overflow-hidden"
    >
      {/* 🌟 Heading */}
      <p className="text-lg font-medium text-gray-200">
        Trusted by{" "}
        <span className="text-yellow-400 font-semibold">200+</span> Hedge Funds & RIAs worldwide
      </p>

      {/* ✨ Gradient Accent Line */}
      <div className="mx-auto mt-4 h-1 w-32 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 rounded-full shadow-md shadow-yellow-400/40"></div>

      {/* 🧠 Supporting Text */}
      <p className="text-gray-400 mt-5 max-w-2xl mx-auto leading-relaxed">
        Empowering every investor with AI-driven research, analytics, and
        market intelligence to deliver consistent alpha.
      </p>

      {/* 📊 TradingView Widget */}
      <div className="mt-10 flex justify-center">
        <div
          className="tradingview-widget-container w-full max-w-6xl border border-yellow-500/30 rounded-2xl shadow-lg shadow-yellow-400/10 overflow-hidden"
          ref={containerRef}
        >
          <div className="tradingview-widget-container__widget"></div>
        </div>
      </div>

      {/* ✨ Glow Effect (optional aesthetic) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-400/5 to-transparent pointer-events-none"></div>
    </section>
  );
};

export default Logos;
