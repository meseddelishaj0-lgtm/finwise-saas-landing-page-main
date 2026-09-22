import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Markets Growth",
  description: "Private equity, venture, and private credit market trends.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/alternatives/private-markets-growth" },
  openGraph: { title: "Private Markets Growth · WallStreetStocks", description: "Private equity, venture, and private credit market trends.", url: "https://www.wallstreetstocks.ai/features/alternatives/private-markets-growth" },
  twitter: { title: "Private Markets Growth · WallStreetStocks", description: "Private equity, venture, and private credit market trends." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
