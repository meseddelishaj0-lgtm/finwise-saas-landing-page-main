import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Track your holdings, performance, and allocation with live prices.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/portfolio/portfolio-tracker" },
  openGraph: { title: "Portfolio Tracker · WallStreetStocks", description: "Track your holdings, performance, and allocation with live prices.", url: "https://www.wallstreetstocks.ai/features/portfolio/portfolio-tracker" },
  twitter: { title: "Portfolio Tracker · WallStreetStocks", description: "Track your holdings, performance, and allocation with live prices." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
