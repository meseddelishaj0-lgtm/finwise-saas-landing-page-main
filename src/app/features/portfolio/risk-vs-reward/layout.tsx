import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk vs Reward",
  description: "Visualize the risk-reward tradeoff across your holdings.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/portfolio/risk-vs-reward" },
  openGraph: { title: "Risk vs Reward · WallStreetStocks", description: "Visualize the risk-reward tradeoff across your holdings.", url: "https://www.wallstreetstocks.ai/features/portfolio/risk-vs-reward" },
  twitter: { title: "Risk vs Reward · WallStreetStocks", description: "Visualize the risk-reward tradeoff across your holdings." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
