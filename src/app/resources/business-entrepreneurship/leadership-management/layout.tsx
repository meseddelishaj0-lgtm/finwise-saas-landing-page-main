import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leadership & Management",
  description: "Leadership and management fundamentals for founders and teams.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/leadership-management" },
  openGraph: { title: "Leadership & Management · WallStreetStocks", description: "Leadership and management fundamentals for founders and teams.", url: "https://www.wallstreetstocks.ai/resources/business-entrepreneurship/leadership-management" },
  twitter: { title: "Leadership & Management · WallStreetStocks", description: "Leadership and management fundamentals for founders and teams." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
