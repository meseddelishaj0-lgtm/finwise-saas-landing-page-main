"use client";

import React, { useEffect, useRef } from "react";

// TradingView ticker tape — the thin scrolling strip of live quotes at the
// very top of the page (Barchart/Yahoo style). Script must be injected via
// createElement; scripts inside dangerouslySetInnerHTML never execute.
const TickerTape: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "NASDAQ 100" },
        { proName: "FOREXCOM:DJI", title: "DOW" },
        { proName: "CBOE:VX1!", title: "VIX" },
        { proName: "BITSTAMP:BTCUSD", title: "BTC" },
        { proName: "BITSTAMP:ETHUSD", title: "ETH" },
        { proName: "TVC:GOLD", title: "GOLD" },
        { proName: "TVC:USOIL", title: "OIL" },
        { proName: "FX:EURUSD", title: "EUR/USD" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "regular",
      colorTheme: "dark",
      locale: "en",
    });
    ref.current.appendChild(script);
  }, []);

  return (
    <div className="w-screen border-b border-yellow-500/10 bg-black/80" style={{ marginLeft: "calc(-50vw + 50%)" }}>
      <div className="tradingview-widget-container h-[46px] overflow-hidden" ref={ref}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
};

export default TickerTape;
