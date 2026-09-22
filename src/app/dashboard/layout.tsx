import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your WallStreetStocks dashboard.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/dashboard" },
  openGraph: { title: "Dashboard · WallStreetStocks", description: "Your WallStreetStocks dashboard.", url: "https://www.wallstreetstocks.ai/dashboard" },
  twitter: { title: "Dashboard · WallStreetStocks", description: "Your WallStreetStocks dashboard." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
