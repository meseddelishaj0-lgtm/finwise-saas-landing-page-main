"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Symbol search that opens the site's own Terminal (no third-party widget).
const StockSearch: React.FC = () => {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "");
    if (clean) router.push(`/terminal?symbol=${encodeURIComponent(clean)}`);
  };

  return (
    <section className="w-full py-14 bg-night">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4 text-ivory">
          AI Stock Dashboard
        </h2>
        <p className="text-gray-400 mb-8">
          Search any stock and open it in the Terminal: charts, fundamentals and news in one view.
        </p>

        <form onSubmit={handleSearch} className="flex justify-center">
          <input
            type="text"
            name="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter a symbol (e.g. TSLA)"
            autoComplete="off"
            spellCheck={false}
            className="rounded-l-lg border border-white/10 bg-white/[0.04] px-4 py-2 w-64 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
          <button
            type="submit"
            className="bg-gold text-night px-6 py-2 rounded-r-lg font-semibold hover:bg-gold-deep transition"
          >
            Open in Terminal
          </button>
        </form>
      </div>
    </section>
  );
};

export default StockSearch;
