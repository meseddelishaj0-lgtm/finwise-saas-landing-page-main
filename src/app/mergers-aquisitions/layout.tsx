import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "M&A Tracker",
  description: "Track mergers and acquisitions — announced deals, targets, and acquirers.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/mergers-aquisitions" },
  openGraph: { title: "M&A Tracker · WallStreetStocks", description: "Track mergers and acquisitions — announced deals, targets, and acquirers.", url: "https://www.wallstreetstocks.ai/mergers-aquisitions" },
  twitter: { title: "M&A Tracker · WallStreetStocks", description: "Track mergers and acquisitions — announced deals, targets, and acquirers." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
