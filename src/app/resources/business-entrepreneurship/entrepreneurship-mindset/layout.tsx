import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrepreneurship Mindset",
  description: "The habits and mindset behind successful founders.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/entrepreneurship-mindset" },
  openGraph: { title: "Entrepreneurship Mindset · WallStreetStocks", description: "The habits and mindset behind successful founders.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/entrepreneurship-mindset" },
  twitter: { title: "Entrepreneurship Mindset · WallStreetStocks", description: "The habits and mindset behind successful founders." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
