import Link from "next/link";
import React from "react";
import { FaFingerprint } from "react-icons/fa";

import { siteDetails } from "@/data/siteDetails";
import { footerDetails } from "@/data/footer";
import { getPlatformIconByName } from "@/utils";

const Footer: React.FC = () => {
  return (
    <footer className="bg-hero-background text-foreground py-10 border-t border-gray-200">
      <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Logo and Description */}
        <div>
          <Link href="/" className="flex items-center gap-2">
            <FaFingerprint className="min-w-fit w-5 h-5 md:w-7 md:h-7" />
            <h3 className="manrope text-xl font-semibold cursor-pointer">
              {siteDetails.siteName}
            </h3>
          </Link>
          <p className="mt-3.5 text-foreground-accent">
            {footerDetails.subheading}
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
          <ul className="text-foreground-accent space-y-2">
            <li>
              <Link
                href="/ai-dashboard"
                className="hover:text-yellow-500 transition-colors"
              >
                AI Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/features"
                className="hover:text-yellow-500 transition-colors"
              >
                Features
              </Link>
            </li>
            <li>
              <Link
                href="/plans"
                className="hover:text-yellow-500 transition-colors"
              >
                Plans
              </Link>
            </li>
            <li>
              <Link
                href="/community"
                className="hover:text-yellow-500 transition-colors"
              >
                Community
              </Link>
            </li>
            <li>
              <Link
                href="/resources"
                className="hover:text-yellow-500 transition-colors"
              >
                Resources
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="hover:text-yellow-500 transition-colors"
              >
                About Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Contact Us</h4>

          {footerDetails.email && (
            <a
              href={`mailto:${footerDetails.email}`}
              className="block text-black hover:text-yellow-600 transition-colors"
            >
              Email: {footerDetails.email}
            </a>
          )}

          {footerDetails.telephone && (
            <a
              href={`tel:${footerDetails.telephone}`}
              className="block text-black hover:text-yellow-600 transition-colors"
            >
              Phone: {footerDetails.telephone}
            </a>
          )}

          {footerDetails.socials && (
            <div className="mt-5 flex items-center gap-5 flex-wrap">
              {Object.keys(footerDetails.socials).map((platformName) => {
                const url = footerDetails.socials[platformName];
                if (url) {
                  return (
                    <Link
                      href={url}
                      key={platformName}
                      aria-label={platformName}
                      className="hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getPlatformIconByName(platformName)}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-8 md:text-center text-foreground-accent px-6">
        <p>
          Copyright &copy; {new Date().getFullYear()} {siteDetails.siteName}. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
