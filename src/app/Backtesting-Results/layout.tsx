import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backtesting Results",
  description: "How WallStreetStocks AI strategies performed on historical market data — returns, drawdowns, and hit rates, tested before they ship.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/Backtesting-Results" },
  openGraph: { title: "Backtesting Results · WallStreetStocks", description: "How WallStreetStocks AI strategies performed on historical market data — returns, drawdowns, and hit rates, tested before they ship.", url: "https://www.wallstreetstocks.ai/Backtesting-Results" },
  twitter: { title: "Backtesting Results · WallStreetStocks", description: "How WallStreetStocks AI strategies performed on historical market data — returns, drawdowns, and hit rates, tested before they ship." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
