import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Trends, Sectors & Sentiment",
  description: "Track sector rotation, market breadth, and investor sentiment with AI-driven trend analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/market-trends" },
  openGraph: { title: "Market Trends, Sectors & Sentiment · WallStreetStocks", description: "Track sector rotation, market breadth, and investor sentiment with AI-driven trend analysis.", url: "https://www.wallstreetstocks.ai/ai-dashboard/market-trends" },
  twitter: { title: "Market Trends, Sectors & Sentiment · WallStreetStocks", description: "Track sector rotation, market breadth, and investor sentiment with AI-driven trend analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
