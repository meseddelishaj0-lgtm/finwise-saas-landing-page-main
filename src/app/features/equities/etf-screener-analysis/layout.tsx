import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ETF Screener",
  description: "Screen and compare ETFs by performance, expense ratio, holdings, and more.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/equities/etf-screener-analysis" },
  openGraph: { title: "ETF Screener · WallStreetStocks", description: "Screen and compare ETFs by performance, expense ratio, holdings, and more.", url: "https://www.wallstreetstocks.ai/features/equities/etf-screener-analysis" },
  twitter: { title: "ETF Screener · WallStreetStocks", description: "Screen and compare ETFs by performance, expense ratio, holdings, and more." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
