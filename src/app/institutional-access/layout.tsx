import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Access",
  description: "Institutional research access plans for funds, RIAs, and professional teams.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/institutional-access" },
  openGraph: { title: "Institutional Access · WallStreetStocks", description: "Institutional research access plans for funds, RIAs, and professional teams.", url: "https://www.wallstreetstocks.ai/institutional-access" },
  twitter: { title: "Institutional Access · WallStreetStocks", description: "Institutional research access plans for funds, RIAs, and professional teams." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
