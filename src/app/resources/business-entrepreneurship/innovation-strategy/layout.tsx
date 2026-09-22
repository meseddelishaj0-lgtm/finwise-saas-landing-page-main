import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innovation Strategy",
  description: "How companies build and sustain innovation.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/innovation-strategy" },
  openGraph: { title: "Innovation Strategy · WallStreetStocks", description: "How companies build and sustain innovation.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/innovation-strategy" },
  twitter: { title: "Innovation Strategy · WallStreetStocks", description: "How companies build and sustain innovation." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
