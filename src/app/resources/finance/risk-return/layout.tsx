import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Understanding Risk & Return",
  description: "How risk and return relate — volatility, Sharpe ratio, and diversification.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/finance/risk-return" },
  openGraph: { title: "Understanding Risk & Return · WallStreetStocks", description: "How risk and return relate — volatility, Sharpe ratio, and diversification.", url: "https://www.wallstreetstocks.ai/resources/finance/risk-return" },
  twitter: { title: "Understanding Risk & Return · WallStreetStocks", description: "How risk and return relate — volatility, Sharpe ratio, and diversification." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
