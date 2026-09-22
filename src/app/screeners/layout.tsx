import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Screeners",
  description: "Pre-built stock screeners — value, growth, dividend, momentum, and more.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/screeners" },
  openGraph: { title: "Stock Screeners · WallStreetStocks", description: "Pre-built stock screeners — value, growth, dividend, momentum, and more.", url: "https://www.wallstreetstocks.ai/screeners" },
  twitter: { title: "Stock Screeners · WallStreetStocks", description: "Pre-built stock screeners — value, growth, dividend, momentum, and more." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
