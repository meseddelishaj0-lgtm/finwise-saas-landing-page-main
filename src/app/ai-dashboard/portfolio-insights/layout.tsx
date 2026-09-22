import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Insights",
  description: "AI insights on your portfolio's performance, concentration, and risk.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/portfolio-insights" },
  openGraph: { title: "Portfolio Insights · WallStreetStocks", description: "AI insights on your portfolio's performance, concentration, and risk.", url: "https://www.wallstreetstocks.ai/ai-dashboard/portfolio-insights" },
  twitter: { title: "Portfolio Insights · WallStreetStocks", description: "AI insights on your portfolio's performance, concentration, and risk." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
