import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Source_Sans_3, Manrope } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteDetails } from "@/data/siteDetails";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const manrope = Manrope({ subsets: ["latin"] });
const sourceSans = Source_Sans_3({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: siteDetails.metadata.title,
  description: siteDetails.metadata.description,
  icons: {
    icon: "/images/wallstreetstocks.png", // ✅ correct relative path
    shortcut: "/images/wallstreetstocks.png",
    apple: "/images/wallstreetstocks.png",
  },
  manifest: "/manifest.json", // ✅ good for SEO & PWA
  alternates: {
    canonical: "https://www.wallstreetstocks.ai/", // ✅ canonical URL added
  },
  metadataBase: new URL("https://www.wallstreetstocks.ai"), // ✅ helps Next.js generate full absolute URLs
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Favicons + metadata */}
        <link rel="icon" href="/images/wallstreetstocks.png" type="image/png" />
        <link rel="shortcut icon" href="/images/wallstreetstocks.png" />
        <link rel="apple-touch-icon" href="/images/wallstreetstocks.png" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta
          name="keywords"
          content="AI investing, financial analysis, WallStreetStocks, equities research, ETFs, market data"
        />
        <meta
          name="author"
          content="WallStreetStocks.ai - Empowering Smart Investors Worldwide"
        />
      </head>

      <body
        className={`${manrope.className} ${sourceSans.className} antialiased bg-gray-50`}
      >
        <SessionProviderWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </SessionProviderWrapper>

        {/* ✅ Google & Vercel Analytics */}
        {siteDetails.googleAnalyticsId && (
          <GoogleAnalytics gaId={siteDetails.googleAnalyticsId} />
        )}
        <Analytics />
      </body>
    </html>
  );
}
