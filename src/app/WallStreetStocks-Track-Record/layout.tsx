import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Record",
  description: "Every WallStreetStocks AI stock pick, logged and measured in public — entries, exits, and returns.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/WallStreetStocks-Track-Record" },
  openGraph: { title: "Track Record · WallStreetStocks", description: "Every WallStreetStocks AI stock pick, logged and measured in public — entries, exits, and returns.", url: "https://www.wallstreetstocks.ai/WallStreetStocks-Track-Record" },
  twitter: { title: "Track Record · WallStreetStocks", description: "Every WallStreetStocks AI stock pick, logged and measured in public — entries, exits, and returns." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
