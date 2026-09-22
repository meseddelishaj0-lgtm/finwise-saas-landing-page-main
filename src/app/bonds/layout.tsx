import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bonds & Fixed Income",
  description: "Treasury yields, the yield curve, credit risk, and bond market data in one place.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/bonds" },
  openGraph: { title: "Bonds & Fixed Income · WallStreetStocks", description: "Treasury yields, the yield curve, credit risk, and bond market data in one place.", url: "https://www.wallstreetstocks.ai/bonds" },
  twitter: { title: "Bonds & Fixed Income · WallStreetStocks", description: "Treasury yields, the yield curve, credit risk, and bond market data in one place." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
