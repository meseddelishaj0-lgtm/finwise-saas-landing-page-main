import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bond Liquidity Heatmap",
  description: "Visualize liquidity across the bond market.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/bonds/liquidity-heatmap" },
  openGraph: { title: "Bond Liquidity Heatmap · WallStreetStocks", description: "Visualize liquidity across the bond market.", url: "https://www.wallstreetstocks.ai/features/bonds/liquidity-heatmap" },
  twitter: { title: "Bond Liquidity Heatmap · WallStreetStocks", description: "Visualize liquidity across the bond market." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
