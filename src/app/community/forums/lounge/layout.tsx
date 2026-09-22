import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Off-Topic Lounge",
  description: "The WallStreetStocks community lounge — off-topic chat between investors.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums/lounge" },
  openGraph: { title: "Off-Topic Lounge · WallStreetStocks", description: "The WallStreetStocks community lounge — off-topic chat between investors.", url: "https://www.wallstreetstocks.ai/community/forums/lounge" },
  twitter: { title: "Off-Topic Lounge · WallStreetStocks", description: "The WallStreetStocks community lounge — off-topic chat between investors." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
