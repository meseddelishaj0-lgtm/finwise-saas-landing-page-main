import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Research & Valuation",
  description: "Research and valuation data for every US stock.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/equities/market-research-valuation" },
  openGraph: { title: "Market Research & Valuation · WallStreetStocks", description: "Research and valuation data for every US stock.", url: "https://www.wallstreetstocks.ai/features/equities/market-research-valuation" },
  twitter: { title: "Market Research & Valuation · WallStreetStocks", description: "Research and valuation data for every US stock." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
