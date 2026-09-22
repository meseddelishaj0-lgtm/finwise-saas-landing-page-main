import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ETFs",
  description: "ETF prices, holdings, performance, and screening with AI analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/etfs" },
  openGraph: { title: "ETFs · WallStreetStocks", description: "ETF prices, holdings, performance, and screening with AI analysis.", url: "https://www.wallstreetstocks.ai/etfs" },
  twitter: { title: "ETFs · WallStreetStocks", description: "ETF prices, holdings, performance, and screening with AI analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
