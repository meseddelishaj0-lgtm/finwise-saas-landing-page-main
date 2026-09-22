import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Lake Pipeline",
  description: "The data pipeline behind WallStreetStocks — market, fundamental, and alternative data unified for AI research.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/ai/data-lake-pipeline" },
  openGraph: { title: "Data Lake Pipeline · WallStreetStocks", description: "The data pipeline behind WallStreetStocks — market, fundamental, and alternative data unified for AI research.", url: "https://www.wallstreetstocks.ai/features/ai/data-lake-pipeline" },
  twitter: { title: "Data Lake Pipeline · WallStreetStocks", description: "The data pipeline behind WallStreetStocks — market, fundamental, and alternative data unified for AI research." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
