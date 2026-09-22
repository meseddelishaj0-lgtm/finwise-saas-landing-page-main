import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Basic",
  description: "The Basic institutional research access plan.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/institutional-access/basic" },
  openGraph: { title: "Institutional Basic · WallStreetStocks", description: "The Basic institutional research access plan.", url: "https://www.wallstreetstocks.ai/institutional-access/basic" },
  twitter: { title: "Institutional Basic · WallStreetStocks", description: "The Basic institutional research access plan." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
