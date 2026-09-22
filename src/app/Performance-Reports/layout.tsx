import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance Reports",
  description: "Periodic performance reports for WallStreetStocks AI picks and strategies, measured against the market.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/Performance-Reports" },
  openGraph: { title: "Performance Reports · WallStreetStocks", description: "Periodic performance reports for WallStreetStocks AI picks and strategies, measured against the market.", url: "https://www.wallstreetstocks.ai/Performance-Reports" },
  twitter: { title: "Performance Reports · WallStreetStocks", description: "Periodic performance reports for WallStreetStocks AI picks and strategies, measured against the market." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
