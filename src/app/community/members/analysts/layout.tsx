import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analysts",
  description: "Analysts in the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/members/analysts" },
  openGraph: { title: "Analysts · WallStreetStocks", description: "Analysts in the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/members/analysts" },
  twitter: { title: "Analysts · WallStreetStocks", description: "Analysts in the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
