import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Screener",
  description: "Screen US stocks by market cap, valuation, growth, dividends, sector, and technicals.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/screener" },
  openGraph: { title: "Stock Screener · WallStreetStocks", description: "Screen US stocks by market cap, valuation, growth, dividends, sector, and technicals.", url: "https://www.wallstreetstocks.ai/screener" },
  twitter: { title: "Stock Screener · WallStreetStocks", description: "Screen US stocks by market cap, valuation, growth, dividends, sector, and technicals." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
