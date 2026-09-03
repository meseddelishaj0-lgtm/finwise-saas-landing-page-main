"use client";

import Link from "next/link";
import React from "react";
import { siteDetails } from "@/data/siteDetails";
import { footerDetails } from "@/data/footer";
import { getPlatformIconByName } from "@/utils";
import AppStoreButton from "@/components/AppStoreButton";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Desk",
    links: [
      { label: "Trading Terminal", href: "/terminal" },
      { label: "Stock Screener", href: "/screener" },
      { label: "Market Heatmap", href: "/heatmap" },
      { label: "AI Stock Picks", href: "/ai-stock-picks" },
      { label: "AI Assistant", href: "/ai-assistant" },
      { label: "Market Calendar", href: "/calendars" },
      { label: "Newsroom", href: "/newsroom" },
    ],
  },
  {
    heading: "Markets",
    links: [
      { label: "Equities", href: "/equities" },
      { label: "ETFs", href: "/etfs" },
      { label: "Crypto", href: "/crypto" },
      { label: "Forex", href: "/forex" },
      { label: "Commodities", href: "/commodities" },
      { label: "Bonds", href: "/bonds" },
      { label: "IPO", href: "/ipo" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about-us" },
      { label: "Plans", href: "/plans" },
      { label: "Community", href: "/community" },
      { label: "Resources", href: "/resources" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Delete Account", href: "/delete-account" },
    ],
  },
];

const Footer: React.FC = () => {
  return (
    <footer id="footer" className="relative w-full text-gray-300 bg-night border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-x-8 gap-y-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span className="font-display text-2xl text-ivory">{siteDetails.siteName}</span>
            </Link>
            <p className="mt-4 max-w-sm text-[15px] text-gray-400 leading-relaxed">
              An AI research desk for every investor — live quotes, plain-English
              research, and a pro-grade terminal on the web and iOS.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <AppStoreButton />
              {footerDetails.socials && (
                <div className="flex items-center gap-4">
                  {Object.entries(footerDetails.socials).map(
                    ([platformName, url]) =>
                      url && (
                        <Link
                          key={platformName}
                          href={url}
                          aria-label={platformName}
                          className="text-gray-500 hover:text-gold transition-colors duration-300"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {getPlatformIconByName(platformName)}
                        </Link>
                      )
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 space-y-1.5 text-sm">
              {footerDetails.email && (
                <a
                  href={`mailto:${footerDetails.email}`}
                  className="block text-gray-400 hover:text-gold transition-colors"
                >
                  {footerDetails.email}
                </a>
              )}
              {footerDetails.telephone && (
                <a
                  href={`tel:${footerDetails.telephone}`}
                  className="block font-monodata text-gray-500 hover:text-gold transition-colors"
                >
                  {footerDetails.telephone}
                </a>
              )}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="eyebrow mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[15px] text-gray-400 hover:text-ivory transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-14 border-t border-white/10 pt-8 text-[13px] leading-relaxed text-gray-500 max-w-4xl">
          <p>
            <strong className="eyebrow text-gray-400">Disclaimer</strong>{" "}
            WallStreetStocks.ai is a financial research and analytics platform
            powered by artificial intelligence and real-time market data. The
            information, tools, and insights provided are for educational and
            informational purposes only and do not constitute investment, legal,
            or tax advice.
          </p>
          <p className="mt-3">
            WallStreetStocks.ai and its AI systems do not make personalized
            investment recommendations or solicit the purchase or sale of any
            security. Past performance is not indicative of future results.
            Users should conduct their own due diligence or consult with a
            licensed financial advisor before making any investment decisions.
          </p>
          <p className="mt-3">
            WallStreetStocks.ai is not registered as a broker-dealer, investment
            advisor, or financial institution with the U.S. Securities and
            Exchange Commission (SEC), the Financial Industry Regulatory
            Authority (FINRA), or any other regulatory body.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="eyebrow">
            © {new Date().getFullYear()} Wall Street Stocks LLC · All rights reserved
          </p>
          <p className="eyebrow">Market data delayed or real-time depending on source · Not investment advice</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
