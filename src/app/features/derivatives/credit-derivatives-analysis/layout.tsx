import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Derivatives Analysis",
  description: "Credit default swaps and credit derivatives market analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/derivatives/credit-derivatives-analysis" },
  openGraph: { title: "Credit Derivatives Analysis · WallStreetStocks", description: "Credit default swaps and credit derivatives market analysis.", url: "https://www.wallstreetstocks.ai/features/derivatives/credit-derivatives-analysis" },
  twitter: { title: "Credit Derivatives Analysis · WallStreetStocks", description: "Credit default swaps and credit derivatives market analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
