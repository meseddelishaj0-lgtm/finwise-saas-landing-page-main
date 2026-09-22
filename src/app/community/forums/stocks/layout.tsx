import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stocks Forum",
  description: "Talk stocks with the WallStreetStocks community — ideas, earnings, and market moves.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums/stocks" },
  openGraph: { title: "Stocks Forum · WallStreetStocks", description: "Talk stocks with the WallStreetStocks community — ideas, earnings, and market moves.", url: "https://www.wallstreetstocks.ai/community/forums/stocks" },
  twitter: { title: "Stocks Forum · WallStreetStocks", description: "Talk stocks with the WallStreetStocks community — ideas, earnings, and market moves." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
