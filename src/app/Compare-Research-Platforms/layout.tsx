import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Research Platforms",
  description: "See how WallStreetStocks stacks up against other stock research platforms on features, data coverage, AI tools, and price.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/Compare-Research-Platforms" },
  openGraph: { title: "Compare Research Platforms · WallStreetStocks", description: "See how WallStreetStocks stacks up against other stock research platforms on features, data coverage, AI tools, and price.", url: "https://www.wallstreetstocks.ai/Compare-Research-Platforms" },
  twitter: { title: "Compare Research Platforms · WallStreetStocks", description: "See how WallStreetStocks stacks up against other stock research platforms on features, data coverage, AI tools, and price." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
