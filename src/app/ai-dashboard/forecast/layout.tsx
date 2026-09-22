import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Market Forecast",
  description: "AI-generated market and stock forecasts built from price action, fundamentals, and macro data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/forecast" },
  openGraph: { title: "AI Market Forecast · WallStreetStocks", description: "AI-generated market and stock forecasts built from price action, fundamentals, and macro data.", url: "https://www.wallstreetstocks.ai/ai-dashboard/forecast" },
  twitter: { title: "AI Market Forecast · WallStreetStocks", description: "AI-generated market and stock forecasts built from price action, fundamentals, and macro data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
