import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Portfolio Rebalancing",
  description: "AI-driven rebalancing suggestions to keep your portfolio on target.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/portfolio/ai-rebalancing" },
  openGraph: { title: "AI Portfolio Rebalancing · WallStreetStocks", description: "AI-driven rebalancing suggestions to keep your portfolio on target.", url: "https://www.wallstreetstocks.ai/features/portfolio/ai-rebalancing" },
  twitter: { title: "AI Portfolio Rebalancing · WallStreetStocks", description: "AI-driven rebalancing suggestions to keep your portfolio on target." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
