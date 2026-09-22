import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Premium",
  description: "The Premium institutional research access plan.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/institutional-access/premium" },
  openGraph: { title: "Institutional Premium · WallStreetStocks", description: "The Premium institutional research access plan.", url: "https://www.wallstreetstocks.ai/institutional-access/premium" },
  twitter: { title: "Institutional Premium · WallStreetStocks", description: "The Premium institutional research access plan." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
