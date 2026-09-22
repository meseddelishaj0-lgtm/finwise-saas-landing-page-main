import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Planning",
  description: "How to write a business plan and model your finances.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/business-planning" },
  openGraph: { title: "Business Planning · WallStreetStocks", description: "How to write a business plan and model your finances.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/business-planning" },
  twitter: { title: "Business Planning · WallStreetStocks", description: "How to write a business plan and model your finances." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
