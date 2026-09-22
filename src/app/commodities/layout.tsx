import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commodities",
  description: "Live prices and AI analysis for gold, oil, natural gas, agriculture, and metals.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/commodities" },
  openGraph: { title: "Commodities · WallStreetStocks", description: "Live prices and AI analysis for gold, oil, natural gas, agriculture, and metals.", url: "https://www.wallstreetstocks.ai/commodities" },
  twitter: { title: "Commodities · WallStreetStocks", description: "Live prices and AI analysis for gold, oil, natural gas, agriculture, and metals." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
