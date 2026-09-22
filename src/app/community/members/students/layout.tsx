import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Students",
  description: "Students learning to invest in the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/members/students" },
  openGraph: { title: "Students · WallStreetStocks", description: "Students learning to invest in the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/members/students" },
  twitter: { title: "Students · WallStreetStocks", description: "Students learning to invest in the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
