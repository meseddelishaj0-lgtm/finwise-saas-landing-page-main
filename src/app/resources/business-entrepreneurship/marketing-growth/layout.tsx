import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing & Growth",
  description: "Marketing and growth strategies for early-stage businesses.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/marketing-growth" },
  openGraph: { title: "Marketing & Growth · WallStreetStocks", description: "Marketing and growth strategies for early-stage businesses.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/marketing-growth" },
  twitter: { title: "Marketing & Growth · WallStreetStocks", description: "Marketing and growth strategies for early-stage businesses." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
