import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Treasury Bonds Dashboard",
  description: "US Treasury yields and bond data across maturities.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/bonds/bond-screener" },
  openGraph: { title: "Treasury Bonds Dashboard · WallStreetStocks", description: "US Treasury yields and bond data across maturities.", url: "https://www.wallstreetstocks.ai/features/bonds/bond-screener" },
  twitter: { title: "Treasury Bonds Dashboard · WallStreetStocks", description: "US Treasury yields and bond data across maturities." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
