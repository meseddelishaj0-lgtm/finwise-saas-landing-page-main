import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Alerts",
  description: "Price, news, and AI signal alerts for the stocks you follow.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/portfolio/smart-alerts" },
  openGraph: { title: "Smart Alerts · WallStreetStocks", description: "Price, news, and AI signal alerts for the stocks you follow.", url: "https://www.wallstreetstocks.ai/features/portfolio/smart-alerts" },
  twitter: { title: "Smart Alerts · WallStreetStocks", description: "Price, news, and AI signal alerts for the stocks you follow." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
