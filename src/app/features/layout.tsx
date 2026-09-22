import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything on the WallStreetStocks desk — terminal, screener, AI research, picks, portfolio tools, and market data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features" },
  openGraph: { title: "Features · WallStreetStocks", description: "Everything on the WallStreetStocks desk — terminal, screener, AI research, picks, portfolio tools, and market data.", url: "https://www.wallstreetstocks.ai/features" },
  twitter: { title: "Features · WallStreetStocks", description: "Everything on the WallStreetStocks desk — terminal, screener, AI research, picks, portfolio tools, and market data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
