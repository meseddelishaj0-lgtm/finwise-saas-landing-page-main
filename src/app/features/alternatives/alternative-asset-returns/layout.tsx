import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alternative Asset Returns",
  description: "Compare returns across alternative asset classes.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/alternatives/alternative-asset-returns" },
  openGraph: { title: "Alternative Asset Returns · WallStreetStocks", description: "Compare returns across alternative asset classes.", url: "https://www.wallstreetstocks.ai/features/alternatives/alternative-asset-returns" },
  twitter: { title: "Alternative Asset Returns · WallStreetStocks", description: "Compare returns across alternative asset classes." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
