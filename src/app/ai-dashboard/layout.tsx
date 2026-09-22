import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Dashboard",
  description: "AI-powered market analysis, forecasts, sector trends, and portfolio insights in one dashboard.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard" },
  openGraph: { title: "AI Dashboard · WallStreetStocks", description: "AI-powered market analysis, forecasts, sector trends, and portfolio insights in one dashboard.", url: "https://www.wallstreetstocks.ai/ai-dashboard" },
  twitter: { title: "AI Dashboard · WallStreetStocks", description: "AI-powered market analysis, forecasts, sector trends, and portfolio insights in one dashboard." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
