import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Build and track your portfolio with live prices and AI insights.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/portfolio" },
  openGraph: { title: "Portfolio · WallStreetStocks", description: "Build and track your portfolio with live prices and AI insights.", url: "https://www.wallstreetstocks.ai/portfolio" },
  twitter: { title: "Portfolio · WallStreetStocks", description: "Build and track your portfolio with live prices and AI insights." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
