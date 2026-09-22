import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Construction",
  description: "How to build a portfolio — allocation, diversification, and intrinsic value.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/finance/portfolio" },
  openGraph: { title: "Portfolio Construction · WallStreetStocks", description: "How to build a portfolio — allocation, diversification, and intrinsic value.", url: "https://www.wallstreetstocks.ai/resources/finance/portfolio" },
  twitter: { title: "Portfolio Construction · WallStreetStocks", description: "How to build a portfolio — allocation, diversification, and intrinsic value." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
