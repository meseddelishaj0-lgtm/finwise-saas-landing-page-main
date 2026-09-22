import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Fundamentals",
  description: "The fundamentals of starting and funding a startup.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/startup-fundamentals" },
  openGraph: { title: "Startup Fundamentals · WallStreetStocks", description: "The fundamentals of starting and funding a startup.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/startup-fundamentals" },
  twitter: { title: "Startup Fundamentals · WallStreetStocks", description: "The fundamentals of starting and funding a startup." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
