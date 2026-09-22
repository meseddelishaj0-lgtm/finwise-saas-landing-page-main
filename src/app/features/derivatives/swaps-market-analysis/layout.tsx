import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swaps Market Analysis",
  description: "Interest rate and currency swaps market analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/derivatives/swaps-market-analysis" },
  openGraph: { title: "Swaps Market Analysis · WallStreetStocks", description: "Interest rate and currency swaps market analysis.", url: "https://www.wallstreetstocks.ai/features/derivatives/swaps-market-analysis" },
  twitter: { title: "Swaps Market Analysis · WallStreetStocks", description: "Interest rate and currency swaps market analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
