import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Market Heatmap",
  description: "A live heatmap of the stock market by sector and market cap.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/heatmap" },
  openGraph: { title: "Stock Market Heatmap · WallStreetStocks", description: "A live heatmap of the stock market by sector and market cap.", url: "https://www.wallstreetstocks.ai/heatmap" },
  twitter: { title: "Stock Market Heatmap · WallStreetStocks", description: "A live heatmap of the stock market by sector and market cap." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
