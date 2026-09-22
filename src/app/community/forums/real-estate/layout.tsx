import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Estate Investing Forum",
  description: "Discuss real estate investing, REITs, and property markets with other investors.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums/real-estate" },
  openGraph: { title: "Real Estate Investing Forum · WallStreetStocks", description: "Discuss real estate investing, REITs, and property markets with other investors.", url: "https://www.wallstreetstocks.ai/community/forums/real-estate" },
  twitter: { title: "Real Estate Investing Forum · WallStreetStocks", description: "Discuss real estate investing, REITs, and property markets with other investors." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
