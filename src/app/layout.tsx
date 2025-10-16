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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${manrope.className} ${sourceSans.className} antialiased bg-gray-50`}
      >
        <SessionProviderWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </SessionProviderWrapper>

        {siteDetails.googleAnalyticsId && (
          <GoogleAnalytics gaId={siteDetails.googleAnalyticsId} />
        )}
        <Analytics />
      </body>
    </html>
  );
}
