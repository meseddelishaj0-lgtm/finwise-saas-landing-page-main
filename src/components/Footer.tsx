"use client";

import Link from "next/link";
import React from "react";
import { FaFingerprint } from "react-icons/fa";
import { siteDetails } from "@/data/siteDetails";
import { footerDetails } from "@/data/footer";
import { getPlatformIconByName } from "@/utils";

const Footer: React.FC = () => {
  return (
    <footer
      id="footer"
      className="relative w-screen overflow-hidden text-gray-300 bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] border-t border-yellow-500/20 py-16"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      {/* Subtle golden radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

      {/* Footer Content */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Logo and Description */}
        <div>
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/images/wallstreetstocks.png"
              alt="WallStreetStocks Logo"
              className="w-8 h-8 object-contain"
            />
            <h3 className="text-2xl font-semibold text-white cursor-pointer">
              {siteDetails.siteName}
            </h3>
          </Link>
          <p className="mt-4 text-gray-400 text-sm leading-relaxed">
            Empowering smart investments with AI-powered financial insights and
            real-time market analytics.
          </p>
        </div>

        {/* Quick Links - Center */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-yellow-400">
            Quick Links
          </h4>
          <ul className="text-gray-400 space-y-2">
            {[
              { label: "AI Dashboard", href: "/ai-dashboard" },
              { label: "Features", href: "/features" },
              { label: "Plans", href: "/plans" },
              { label: "Community", href: "/community" },
              { label: "Resources", href: "/resources" },
              { label: "About Us", href: "/about-us" },
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Delete Account", href: "/delete-account" },
            ].map(({ label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info - Right */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-yellow-400">
            Contact Us
          </h4>

          {footerDetails.email && (
            <a
              href={`mailto:${footerDetails.email}`}
              className="block text-gray-300 hover:text-yellow-400 transition-colors"
            >
              Email: {footerDetails.email}
            </a>
          )}

          {footerDetails.telephone && (
            <a
              href={`tel:${footerDetails.telephone}`}
              className="block mt-2 text-gray-300 hover:text-yellow-400 transition-colors"
            >
              Phone: {footerDetails.telephone}
            </a>
          )}

          {footerDetails.socials && (
            <div className="mt-5 flex items-center gap-5 flex-wrap">
              {Object.entries(footerDetails.socials).map(
                ([platformName, url]) =>
                  url && (
                    <Link
                      key={platformName}
                      href={url}
                      aria-label={platformName}
                      className="text-yellow-400 hover:text-white transition-all duration-300"
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
      </div>

      {/* Disclaimer */}
      <div className="relative z-10 mt-12 border-t border-yellow-500/10 pt-8 max-w-5xl mx-auto text-sm md:text-base text-gray-400 px-6 leading-relaxed">
        <p className="text-justify">
          <strong className="text-yellow-400">Disclaimer:</strong> WallStreetStocks.ai
          is a financial research and analytics platform powered by artificial
          intelligence and real-time market data. The information, tools, and
          insights provided are for educational and informational purposes only
          and do not constitute investment, legal, or tax advice.
        </p>
        <p className="mt-4 text-justify">
          WallStreetStocks.ai and its AI systems do not make personalized
          investment recommendations or solicit the purchase or sale of any
          security. Past performance is not indicative of future results. Users
          should conduct their own due diligence or consult with a licensed
          financial advisor before making any investment decisions.
        </p>
        <p className="mt-4 text-justify">
          WallStreetStocks.ai is not registered as a broker-dealer, investment
          advisor, or financial institution with the U.S. Securities and
          Exchange Commission (SEC), the Financial Industry Regulatory Authority
          (FINRA), or any other regulatory body.
        </p>
      </div>

      {/* Copyright */}
      <div className="relative z-10 mt-10 border-t border-yellow-500/10 pt-6 max-w-7xl mx-auto px-6">
        <p className="text-gray-500 text-center">
          © {new Date().getFullYear()} {siteDetails.siteName}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
