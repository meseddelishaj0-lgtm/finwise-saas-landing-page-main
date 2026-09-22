import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WallStreetStocks vs the S&P 500",
  description: "How WallStreetStocks AI picks have performed against the S&P 500 benchmark over time.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/WallStreetStocks-vs-SP500" },
  openGraph: { title: "WallStreetStocks vs the S&P 500 · WallStreetStocks", description: "How WallStreetStocks AI picks have performed against the S&P 500 benchmark over time.", url: "https://www.wallstreetstocks.ai/WallStreetStocks-vs-SP500" },
  twitter: { title: "WallStreetStocks vs the S&P 500 · WallStreetStocks", description: "How WallStreetStocks AI picks have performed against the S&P 500 benchmark over time." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
