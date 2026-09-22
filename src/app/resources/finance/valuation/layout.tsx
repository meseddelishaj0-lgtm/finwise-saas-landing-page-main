import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Valuation Models Guide",
  description: "DCF, multiples, and other stock valuation models explained.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/finance/valuation" },
  openGraph: { title: "Valuation Models Guide · WallStreetStocks", description: "DCF, multiples, and other stock valuation models explained.", url: "https://www.wallstreetstocks.ai/resources/finance/valuation" },
  twitter: { title: "Valuation Models Guide · WallStreetStocks", description: "DCF, multiples, and other stock valuation models explained." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
