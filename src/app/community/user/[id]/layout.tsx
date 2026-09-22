import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const description = "A WallStreetStocks community member profile.";
  return {
    title: { absolute: "Member Profile · WallStreetStocks" },
    description,
    alternates: { canonical: `https://www.wallstreetstocks.ai/community/user/${encodeURIComponent(params.id)}` },
    openGraph: { title: "Member Profile · WallStreetStocks", description },
    twitter: { title: "Member Profile · WallStreetStocks", description },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
