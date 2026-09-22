import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mortgage Calculator",
  description: "Estimate monthly mortgage payments, interest, and amortization.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator/mortgage-calculator" },
  openGraph: { title: "Mortgage Calculator · WallStreetStocks", description: "Estimate monthly mortgage payments, interest, and amortization.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator/mortgage-calculator" },
  twitter: { title: "Mortgage Calculator · WallStreetStocks", description: "Estimate monthly mortgage payments, interest, and amortization." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
