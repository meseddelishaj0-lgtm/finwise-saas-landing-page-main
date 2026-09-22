import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your WallStreetStocks subscription is active.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/success" },
  openGraph: { title: "Payment Successful · WallStreetStocks", description: "Your WallStreetStocks subscription is active.", url: "https://www.wallstreetstocks.ai/success" },
  twitter: { title: "Payment Successful · WallStreetStocks", description: "Your WallStreetStocks subscription is active." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
