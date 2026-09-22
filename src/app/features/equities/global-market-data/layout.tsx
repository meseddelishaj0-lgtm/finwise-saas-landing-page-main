import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Market Data",
  description: "Live global indices, equities, and market data across regions.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/equities/global-market-data" },
  openGraph: { title: "Global Market Data · WallStreetStocks", description: "Live global indices, equities, and market data across regions.", url: "https://www.wallstreetstocks.ai/features/equities/global-market-data" },
  twitter: { title: "Global Market Data · WallStreetStocks", description: "Live global indices, equities, and market data across regions." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
