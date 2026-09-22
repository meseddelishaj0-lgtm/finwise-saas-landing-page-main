import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investors",
  description: "Investors in the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/members/investors" },
  openGraph: { title: "Investors · WallStreetStocks", description: "Investors in the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/members/investors" },
  twitter: { title: "Investors · WallStreetStocks", description: "Investors in the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
