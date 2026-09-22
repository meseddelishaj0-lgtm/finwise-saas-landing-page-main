import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Assets Dashboard",
  description: "Real estate, infrastructure, and commodity real-asset data in one dashboard.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/alternatives/real-assets-dashboard" },
  openGraph: { title: "Real Assets Dashboard · WallStreetStocks", description: "Real estate, infrastructure, and commodity real-asset data in one dashboard.", url: "https://www.wallstreetstocks.ai/features/alternatives/real-assets-dashboard" },
  twitter: { title: "Real Assets Dashboard · WallStreetStocks", description: "Real estate, infrastructure, and commodity real-asset data in one dashboard." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
