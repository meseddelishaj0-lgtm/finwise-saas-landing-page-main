import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Forecasts Forum",
  description: "Discuss AI market forecasts and analysis with the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums/ai-forecasts" },
  openGraph: { title: "AI Forecasts Forum · WallStreetStocks", description: "Discuss AI market forecasts and analysis with the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/forums/ai-forecasts" },
  twitter: { title: "AI Forecasts Forum · WallStreetStocks", description: "Discuss AI market forecasts and analysis with the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
