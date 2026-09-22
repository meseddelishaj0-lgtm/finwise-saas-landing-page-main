import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investing Resources",
  description: "Guides, explainers, and calculators on finance, markets, taxes, real estate, and more.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources" },
  openGraph: { title: "Investing Resources · WallStreetStocks", description: "Guides, explainers, and calculators on finance, markets, taxes, real estate, and more.", url: "https://www.wallstreetstocks.ai/resources" },
  twitter: { title: "Investing Resources · WallStreetStocks", description: "Guides, explainers, and calculators on finance, markets, taxes, real estate, and more." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
