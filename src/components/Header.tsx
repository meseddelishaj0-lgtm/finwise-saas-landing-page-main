"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import { HiOutlineXMark, HiBars3, HiChevronDown } from "react-icons/hi2";
import { useSession, signOut } from "next-auth/react";
import Container from "./Container";
import DropdownMenu from "@/components/ui/DropdownMenu";

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSubmenu = (label: string) =>
    setOpenMobileMenu(openMobileMenu === label ? null : label);

  const userName = session?.user?.email?.split("@")[0] || "User";
  const displayName =
    userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-black/80 backdrop-blur-lg py-2 border-b border-gray-900/50"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm py-4 border-none"
      }`}
    >
      <Container>
        <nav className="flex items-center justify-between text-white">
          {/* ✅ Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group flex-shrink-0 -ml-2"
          >
            <Image
              src="/images/wallstreetstocks.png"
              alt="WallStreetStocks Logo"
              width={isScrolled ? 42 : 56}
              height={42}
              className="rounded-md transition-all duration-300 group-hover:scale-105"
            />
            <span className="text-xl font-extrabold tracking-tight">
              WallStreetStocks
            </span>
          </Link>

          {/* ✅ Desktop Menu */}
          <div
            className={`hidden md:flex items-center space-x-10 transition-all duration-300 relative z-50 ${
              session ? "ml-2" : ""
            }`}
          >
            <DropdownMenu
              label="Products"
              items={[
                { title: "AI Dashboard", href: "/ai-dashboard" },
                { title: "Market Screener", href: "/screeners" },
                { title: "Market Calendar", href: "/calendars" },
                { title: "Market News", href: "/news" },
                { title: "AI Stock Picks", href: "/ai-stock-picks" },
                { title: "AI Assistant", href: "/ai-assistant" },
                { title: "Mergers & Acquisitions", href: "/mergers-aquisitions" },
                { title: "Valuation Models", href: "/valuation-models" },
              ]}
              textColor="text-white"
            />
            <DropdownMenu
              label="Markets"
              items={[
                { title: "Equities", href: "/equities" },
                { title: "ETFs", href: "/etfs" },
                { title: "Bonds", href: "/bonds" },
                { title: "Crypto", href: "/crypto" },
                { title: "Derivatives", href: "/derivatives" },
                { title: "Forex", href: "/forex" },
                { title: "Alternatives", href: "/alternatives" },
                { title: "Commodities", href: "/commodities" },
                { title: "IPO", href: "/ipo" },
                { title: "Money Market", href: "/money-market" },
              ]}
              textColor="text-white"
            />
            <DropdownMenu
              label="Community"
              items={[
                { title: "Forums", href: "/community/forums" },
                { title: "Members", href: "/community/members" },
                { title: "Rooms", href: "/community/rooms" },
              ]}
              textColor="text-white"
            />
            <DropdownMenu
              label="Plans"
              items={[
                { title: "Gold", href: "/plans" },
                { title: "Platinum", href: "/plans" },
                { title: "Diamond", href: "/plans" },
                { title: "Institutional", href: "/institutional-access" },
              ]}
              textColor="text-white"
            />
            <DropdownMenu
              label="Performance"
              items={[
                { title: "WallStreetStocks vs S&P 500", href: "/WallStreetStocks-vs-SP500" },
                { title: "WallStreetStocks Track Record", href: "/WallStreetStocks-Track-Record" },
                { title: "Risk & Volatility Analysis", href: "/Risk-Volatility-Analysis" },
                { title: "Backtesting Results", href: "/Backtesting-Results" },
                { title: "Performance Reports", href: "/Performance-Reports" },
                { title: "Compare Research Platforms", href: "/Compare-Research-Platforms" },
              ]}
              textColor="text-white"
            />
            <DropdownMenu
              label="Resources"
              items={[
                { title: "Finance", href: "/resources/finance" },
                { title: "Accounting", href: "/resources/accounting" },
                { title: "Real Estate", href: "/resources/real-estate" },
                { title: "Insurance", href: "/resources/insurance" },
                { title: "Taxes", href: "/resources/taxes" },
                { title: "Market", href: "/resources/market" },
                { title: "Tools & Calculator", href: "/resources/tools-calculator" },
                { title: "Business & Entrepreneurship", href: "/resources/business-entrepreneurship" },
              ]}
              textColor="text-white"
            />

            <Link
              href="/about-us"
              className="text-white hover:text-yellow-400 font-medium transition-all duration-200"
            >
              About Us
            </Link>

            {/* ✅ Login / Logout */}
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-black bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                >
                  {displayName}'s Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-white bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-black bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-full text-sm font-semibold transition-all"
              >
                Login
              </Link>
            )}
          </div>

          {/* ✅ Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="bg-yellow-400 text-black rounded-full w-9 h-9 flex items-center justify-center shadow-md hover:shadow-yellow-300/50 transition-all"
            >
              {isOpen ? (
                <HiOutlineXMark className="h-5 w-5" />
              ) : (
                <HiBars3 className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>
      </Container>

      {/* ✅ Mobile Dropdown Menu */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 -translate-y-3"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150 transform"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-3"
      >
        <div className="md:hidden bg-black/95 text-white backdrop-blur-md shadow-2xl border-t border-gray-800">
          <ul className="flex flex-col space-y-2 py-4 px-6">
            {[ /* (mobile nav unchanged) */ 
              {
                label: "Products",
                items: [
                  { title: "AI Dashboard", href: "/ai-dashboard" },
                  { title: "Market Screener", href: "/screeners" },
                  { title: "Market Calendar", href: "/calendars" },
                  { title: "Market News", href: "/news" },
                  { title: "AI Stock Picks", href: "/ai-stock-picks" },
                  { title: "AI Assistant", href: "/ai-assistant" },
                  { title: "Mergers & Acquisitions", href: "/mergers-aquisitions" },
                  { title: "Valuation Models", href: "/valuation-models" },
                ],
              },
              {
                label: "Markets",
                items: [
                  { title: "Equities", href: "/equities" },
                  { title: "ETFs", href: "/etfs" },
                  { title: "Bonds", href: "/bonds" },
                  { title: "Crypto", href: "/crypto" },
                  { title: "Derivatives", href: "/derivatives" },
                  { title: "Forex", href: "/forex" },
                  { title: "Alternatives", href: "/alternatives" },
                  { title: "Commodities", href: "/commodities" },
                  { title: "IPO", href: "/ipo" },
                  { title: "Money Market", href: "/money-market" },
                ],
              },
              {
                label: "Community",
                items: [
                  { title: "Forums", href: "/community/forums" },
                  { title: "Members", href: "/community/members" },
                  { title: "Rooms", href: "/community/rooms" },
                ],
              },
              {
                label: "Plans",
                items: [
                  { title: "Gold", href: "/plans" },
                  { title: "Platinum", href: "/plans" },
                  { title: "Diamond", href: "/plans" },
                  { title: "Institutional", href: "/institutional-access" },
                ],
              },
              {
                label: "Performance",
                items: [
                  { title: "WallStreetStocks vs S&P 500", href: "/WallStreetStocks-vs-SP500" },
                  { title: "WallStreetStocks Track Record", href: "/WallStreetStocks-Track-Record" },
                  { title: "Risk & Volatility Analysis", href: "/Risk-Volatility-Analysis" },
                  { title: "Backtesting Results", href: "/Backtesting-Results" },
                  { title: "Performance Reports", href: "/Performance-Reports" },
                  { title: "Compare Research Platforms", href: "/Compare-Research-Platforms" },
                ],
              },
              {
                label: "Resources",
                items: [
                  { title: "Finance", href: "/resources/finance" },
                  { title: "Accounting", href: "/resources/accounting" },
                  { title: "Real Estate", href: "/resources/real-estate" },
                  { title: "Insurance", href: "/resources/insurance" },
                  { title: "Taxes", href: "/resources/taxes" },
                  { title: "Market", href: "/resources/market" },
                  { title: "Tools & Calculator", href: "/resources/tools-calculator" },
                  { title: "Business & Entrepreneurship", href: "/resources/business-entrepreneurship" },
                ],
              },
            ].map(({ label, items }) => (
              <li key={label}>
                <button
                  onClick={() => toggleSubmenu(label)}
                  className="w-full flex justify-between items-center text-gray-300 hover:text-yellow-400 py-2 text-left font-medium"
                >
                  {label}
                  <HiChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openMobileMenu === label ? "rotate-180 text-yellow-400" : ""
                    }`}
                  />
                </button>
                {openMobileMenu === label && (
                  <ul className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
                    {items.map((subItem) => (
                      <li key={subItem.title}>
                        <Link
                          href={subItem.href}
                          onClick={() => setIsOpen(false)}
                          className="block py-1 text-gray-400 hover:text-yellow-400 text-sm transition-all"
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            <li>
              <Link
                href="/about-us"
                onClick={() => setIsOpen(false)}
                className="block text-gray-300 hover:text-yellow-400 py-2"
              >
                About Us
              </Link>
            </li>

            {session ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="block w-full bg-yellow-400 text-black font-semibold text-center py-3 rounded-full shadow-md hover:bg-yellow-500 transition-all"
                  >
                    {displayName}'s Dashboard
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full bg-gray-800 text-white font-semibold text-center py-3 rounded-full shadow-md hover:bg-gray-700 transition-all"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full bg-yellow-400 text-black font-semibold text-center py-3 rounded-full shadow-md hover:bg-yellow-500 transition-all"
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      </Transition>
    </header>
  );
};

export default Header;
