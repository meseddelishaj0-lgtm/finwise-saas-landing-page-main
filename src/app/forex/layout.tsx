import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forex",
  description: "Live currency exchange rates and forex market data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/forex" },
  openGraph: { title: "Forex · WallStreetStocks", description: "Live currency exchange rates and forex market data.", url: "https://www.wallstreetstocks.ai/forex" },
  twitter: { title: "Forex · WallStreetStocks", description: "Live currency exchange rates and forex market data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
