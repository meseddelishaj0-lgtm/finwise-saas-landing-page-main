import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "US Stocks",
  description: "Browse every US stock with live quotes, fundamentals, and AI research.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/equities" },
  openGraph: { title: "US Stocks · WallStreetStocks", description: "Browse every US stock with live quotes, fundamentals, and AI research.", url: "https://www.wallstreetstocks.ai/equities" },
  twitter: { title: "US Stocks · WallStreetStocks", description: "Browse every US stock with live quotes, fundamentals, and AI research." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
