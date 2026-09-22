import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "WallStreetStocks is an AI research desk for every investor — live quotes, plain-English research, and a pro-grade terminal on the web and iOS.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/about-us" },
  openGraph: { title: "About Us · WallStreetStocks", description: "WallStreetStocks is an AI research desk for every investor — live quotes, plain-English research, and a pro-grade terminal on the web and iOS.", url: "https://www.wallstreetstocks.ai/about-us" },
  twitter: { title: "About Us · WallStreetStocks", description: "WallStreetStocks is an AI research desk for every investor — live quotes, plain-English research, and a pro-grade terminal on the web and iOS." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
