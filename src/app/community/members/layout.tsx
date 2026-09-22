import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Members",
  description: "Meet the WallStreetStocks community — analysts, investors, and students.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/members" },
  openGraph: { title: "Community Members · WallStreetStocks", description: "Meet the WallStreetStocks community — analysts, investors, and students.", url: "https://www.wallstreetstocks.ai/community/members" },
  twitter: { title: "Community Members · WallStreetStocks", description: "Meet the WallStreetStocks community — analysts, investors, and students." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
