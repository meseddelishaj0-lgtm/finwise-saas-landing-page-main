import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { Source_Sans_3, Newsreader, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteDetails } from "@/data/siteDetails";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

// Body sans — humanist, comfortable for long reads and dense data alike
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
// Editorial serif for display headlines (financial-print masthead voice)
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  adjustFontFallback: false,
  fallback: ["Georgia", "serif"],
  display: "swap",
});
// Machine mono for data, commands, and labels (terminal voice)
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-wss",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WallStreetStocks — AI research desk with a live terminal",
    template: "%s · WallStreetStocks",
  },
  description:
    "Live quotes, AI stock research, and a pro-grade terminal for equities, ETFs, crypto, forex, and commodities. The whole desk, without the desk job.",
  keywords: [
    "AI investing",
    "stock research",
    "trading terminal",
    "stock screener",
    "market data",
    "WallStreetStocks",
  ],
  authors: [{ name: "WallStreetStocks" }],
  openGraph: {
    type: "website",
    siteName: siteDetails.siteName,
    title: "WallStreetStocks — AI research desk with a live terminal",
    description:
      "Live quotes, AI stock research, and a pro-grade terminal — the whole desk, without the desk job.",
    url: siteDetails.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    site: "@WallStStocksAI",
    creator: "@WallStStocksAI",
  },
  icons: {
    icon: "/images/wallstreetstocks.png",
    shortcut: "/images/wallstreetstocks.png",
    apple: "/images/wallstreetstocks.png",
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.wallstreetstocks.ai"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0C09",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Flag JS availability before paint so scroll reveals can start hidden.
            Without JS the page renders fully visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>

      <body
        className={`${sourceSans.variable} ${newsreader.variable} ${plexMono.variable} font-sans antialiased bg-night text-ivory`}
      >
        <SessionProviderWrapper>
          <Header />
          {/* pt-16 clears the fixed 64px header on every page */}
          <main className="pt-16">{children}</main>
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
