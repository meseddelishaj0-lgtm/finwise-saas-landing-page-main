import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Estate Guide",
  description: "Real estate investing — REITs, rentals, mortgages, and returns.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/real-estate" },
  openGraph: { title: "Real Estate Guide · WallStreetStocks", description: "Real estate investing — REITs, rentals, mortgages, and returns.", url: "https://www.wallstreetstocks.ai/resources/real-estate" },
  twitter: { title: "Real Estate Guide · WallStreetStocks", description: "Real estate investing — REITs, rentals, mortgages, and returns." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
