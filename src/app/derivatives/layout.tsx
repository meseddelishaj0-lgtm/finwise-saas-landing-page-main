import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Derivatives",
  description: "Futures, swaps, credit derivatives, and asset-backed securities analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/derivatives" },
  openGraph: { title: "Derivatives · WallStreetStocks", description: "Futures, swaps, credit derivatives, and asset-backed securities analysis.", url: "https://www.wallstreetstocks.ai/derivatives" },
  twitter: { title: "Derivatives · WallStreetStocks", description: "Futures, swaps, credit derivatives, and asset-backed securities analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
