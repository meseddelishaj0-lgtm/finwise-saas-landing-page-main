import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business & Entrepreneurship",
  description: "Guides on starting, planning, leading, and growing a business.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship" },
  openGraph: { title: "Business & Entrepreneurship · WallStreetStocks", description: "Guides on starting, planning, leading, and growing a business.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship" },
  twitter: { title: "Business & Entrepreneurship · WallStreetStocks", description: "Guides on starting, planning, leading, and growing a business." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
