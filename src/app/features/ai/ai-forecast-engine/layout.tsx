import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Forecast Engine",
  description: "How the WallStreetStocks AI forecast engine turns market data into forward-looking signals.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/ai/ai-forecast-engine" },
  openGraph: { title: "AI Forecast Engine · WallStreetStocks", description: "How the WallStreetStocks AI forecast engine turns market data into forward-looking signals.", url: "https://www.wallstreetstocks.ai/features/ai/ai-forecast-engine" },
  twitter: { title: "AI Forecast Engine · WallStreetStocks", description: "How the WallStreetStocks AI forecast engine turns market data into forward-looking signals." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
