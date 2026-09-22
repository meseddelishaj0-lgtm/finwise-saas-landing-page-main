import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Guides",
  description: "How markets work — exchanges, orders, indices, and market structure.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/market" },
  openGraph: { title: "Market Guides · WallStreetStocks", description: "How markets work — exchanges, orders, indices, and market structure.", url: "https://www.wallstreetstocks.ai/resources/market" },
  twitter: { title: "Market Guides · WallStreetStocks", description: "How markets work — exchanges, orders, indices, and market structure." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
