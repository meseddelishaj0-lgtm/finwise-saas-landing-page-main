import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset-Backed Securities Analysis",
  description: "Analysis of asset-backed securities markets and credit quality.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/derivatives/asset-backed-securities-analysis" },
  openGraph: { title: "Asset-Backed Securities Analysis · WallStreetStocks", description: "Analysis of asset-backed securities markets and credit quality.", url: "https://www.wallstreetstocks.ai/features/derivatives/asset-backed-securities-analysis" },
  twitter: { title: "Asset-Backed Securities Analysis · WallStreetStocks", description: "Analysis of asset-backed securities markets and credit quality." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
