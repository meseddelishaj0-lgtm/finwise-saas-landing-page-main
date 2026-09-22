import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Calendar",
  description: "Earnings, economic, IPO, dividend, and stock split calendars — everything moving the market this week.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/calendars" },
  openGraph: { title: "Market Calendar · WallStreetStocks", description: "Earnings, economic, IPO, dividend, and stock split calendars — everything moving the market this week.", url: "https://www.wallstreetstocks.ai/calendars" },
  twitter: { title: "Market Calendar · WallStreetStocks", description: "Earnings, economic, IPO, dividend, and stock split calendars — everything moving the market this week." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
