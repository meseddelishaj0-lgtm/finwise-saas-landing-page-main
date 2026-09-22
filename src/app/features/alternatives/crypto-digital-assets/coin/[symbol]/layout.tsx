import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { symbol: string } }): Metadata {
  const sym = decodeURIComponent(params.symbol).toUpperCase().slice(0, 20);
  const title = `${sym} Price Chart & Live Quote`;
  const description = `Live ${sym} price, chart, market cap, and volume on WallStreetStocks.`;
  const url = `https://www.wallstreetstocks.ai/features/alternatives/crypto-digital-assets/coin/${encodeURIComponent(sym)}`;
  return {
    title: { absolute: `${title} · WallStreetStocks` },
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · WallStreetStocks`, description, url },
    twitter: { title: `${title} · WallStreetStocks`, description },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
