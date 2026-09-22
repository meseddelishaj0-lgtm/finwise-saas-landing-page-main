import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Pro",
  description: "The Pro institutional research access plan.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/institutional-access/pro" },
  openGraph: { title: "Institutional Pro · WallStreetStocks", description: "The Pro institutional research access plan.", url: "https://www.wallstreetstocks.ai/institutional-access/pro" },
  twitter: { title: "Institutional Pro · WallStreetStocks", description: "The Pro institutional research access plan." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
