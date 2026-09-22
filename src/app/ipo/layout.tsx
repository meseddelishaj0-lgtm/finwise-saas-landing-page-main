import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IPO Tracker",
  description: "Upcoming and recent IPOs — dates, pricing, and first-day performance.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ipo" },
  openGraph: { title: "IPO Tracker · WallStreetStocks", description: "Upcoming and recent IPOs — dates, pricing, and first-day performance.", url: "https://www.wallstreetstocks.ai/ipo" },
  twitter: { title: "IPO Tracker · WallStreetStocks", description: "Upcoming and recent IPOs — dates, pricing, and first-day performance." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
