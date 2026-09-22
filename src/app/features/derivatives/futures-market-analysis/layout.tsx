import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Futures Market Analysis",
  description: "Futures prices, curves, and positioning across asset classes.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/derivatives/futures-market-analysis" },
  openGraph: { title: "Futures Market Analysis · WallStreetStocks", description: "Futures prices, curves, and positioning across asset classes.", url: "https://www.wallstreetstocks.ai/features/derivatives/futures-market-analysis" },
  twitter: { title: "Futures Market Analysis · WallStreetStocks", description: "Futures prices, curves, and positioning across asset classes." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
