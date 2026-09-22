import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Forums",
  description: "Investor discussion forums on stocks, strategies, real estate, AI forecasts, and more.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums" },
  openGraph: { title: "Community Forums · WallStreetStocks", description: "Investor discussion forums on stocks, strategies, real estate, AI forecasts, and more.", url: "https://www.wallstreetstocks.ai/community/forums" },
  twitter: { title: "Community Forums · WallStreetStocks", description: "Investor discussion forums on stocks, strategies, real estate, AI forecasts, and more." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
