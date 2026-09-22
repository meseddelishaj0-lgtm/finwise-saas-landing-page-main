import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto & Digital Assets Screener",
  description: "Screen cryptocurrencies by price, market cap, volume, and momentum.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/alternatives/crypto-digital-assets" },
  openGraph: { title: "Crypto & Digital Assets Screener · WallStreetStocks", description: "Screen cryptocurrencies by price, market cap, volume, and momentum.", url: "https://www.wallstreetstocks.ai/features/alternatives/crypto-digital-assets" },
  twitter: { title: "Crypto & Digital Assets Screener · WallStreetStocks", description: "Screen cryptocurrencies by price, market cap, volume, and momentum." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
