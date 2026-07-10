"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import { HiOutlineXMark, HiBars3, HiChevronDown } from "react-icons/hi2";
import { useSession, signOut } from "next-auth/react";
import Container from "./Container";
import DropdownMenu from "@/components/ui/DropdownMenu";
import SymbolSearch from "@/components/market/SymbolSearch";

// Consolidated nav — shared by desktop and mobile
const NAV_MENUS: { label: string; items: { title: string; href: string }[] }[] = [
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
    label: "Products",
    items: [
      { title: "Stock Screener", href: "/screener" },
      { title: "Market Heatmap", href: "/heatmap" },
      { title: "AI Dashboard", href: "/ai-dashboard" },
      { title: "Market Calendar", href: "/calendars" },
      { title: "Market News", href: "/news" },
      { title: "AI Stock Picks", href: "/ai-stock-picks" },
      { title: "AI Assistant", href: "/ai-assistant" },
      { title: "Mergers & Acquisitions", href: "/mergers-aquisitions" },
      { title: "Valuation Models", href: "/valuation-models" },
    ],
  },
  {
    label: "Research",
    items: [
      { title: "WallStreetStocks vs S&P 500", href: "/WallStreetStocks-vs-SP500" },
      { title: "Track Record", href: "/WallStreetStocks-Track-Record" },
      { title: "Risk & Volatility Analysis", href: "/Risk-Volatility-Analysis" },
      { title: "Backtesting Results", href: "/Backtesting-Results" },
      { title: "Performance Reports", href: "/Performance-Reports" },
      { title: "Compare Platforms", href: "/Compare-Research-Platforms" },
      { title: "Finance", href: "/resources/finance" },
      { title: "Accounting", href: "/resources/accounting" },
      { title: "Real Estate", href: "/resources/real-estate" },
      { title: "Insurance", href: "/resources/insurance" },
      { title: "Taxes", href: "/resources/taxes" },
      { title: "Market Basics", href: "/resources/market" },
      { title: "Tools & Calculators", href: "/resources/tools-calculator" },
      { title: "Business & Entrepreneurship", href: "/resources/business-entrepreneurship" },
      { title: "Institutional Access", href: "/institutional-access" },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Forums", href: "/community/forums" },
      { title: "Members", href: "/community/members" },
      { title: "Rooms", href: "/community/rooms" },
      { title: "About Us", href: "/about-us" },
    ],
  },
];

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  // Inline search fits when logged out; logged-in users get the icon toggle
  const showInlineSearch = !session;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-night/90 backdrop-blur-lg py-2 border-b border-yellow-500/15"
          : "bg-gradient-to-b from-night/90 via-night/45 to-transparent backdrop-blur-sm py-3 border-none"
      }`}
    >
      <Container>
        <nav className="flex items-center text-white gap-3">
          {/* ✅ Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group flex-shrink-0 -ml-2"
          >
            <Image
              src="/images/wallstreetstocks.png"
              alt="WallStreetStocks Logo"
              width={isScrolled ? 38 : 46}
              height={38}
              className="rounded-md transition-all duration-300 group-hover:scale-105"
            />
            <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
              WallStreetStocks
            </span>
          </Link>

          {/* ✅ Inline symbol search (desktop, logged out) */}
          {showInlineSearch && (
            <div className="hidden xl:block w-[230px] ml-3 flex-shrink-0">
              <SymbolSearch variant="header" />
            </div>
          )}

          {/* ✅ Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 ml-auto relative z-50">
            {/* Search icon (when inline input is hidden) */}
            <button
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Search symbols"
              className={`${showInlineSearch ? "xl:hidden" : ""} flex items-center justify-center w-9 h-9 rounded-full border transition-all flex-shrink-0 ${
                searchOpen
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/[0.06] border-white/10 text-gray-300 hover:text-yellow-300 hover:border-yellow-400/50"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <Link
              href="/terminal"
              className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 font-semibold transition-all duration-200 whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Terminal
            </Link>

            {NAV_MENUS.map((menu) => (
              <DropdownMenu
                key={menu.label}
                label={menu.label}
                items={menu.items}
                textColor="text-white"
              />
            ))}

            <Link
              href="/plans"
              className="text-white hover:text-yellow-400 font-medium transition-all duration-200"
            >
              Plans
            </Link>

            {/* ✅ Login / Logout */}
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-black bg-yellow-400 hover:bg-yellow-500 px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                >
                  {displayName}'s Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-white bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
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
          <div className="md:hidden ml-auto">
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

      {/* ✅ Expanding search panel (desktop) */}
      {searchOpen && (
        <div
          className="hidden md:block absolute left-0 right-0 top-full bg-black/95 backdrop-blur-lg border-b border-yellow-500/15 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
        >
          <Container>
            <div className="max-w-xl mx-auto">
              <SymbolSearch variant="terminal" autoFocus onNavigate={() => setSearchOpen(false)} />
              <p className="mt-2 text-center text-[11px] text-gray-600">
                Search any stock, ETF, index, or crypto — opens in the Terminal
              </p>
            </div>
          </Container>
        </div>
      )}

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
            <li className="pb-1">
              <SymbolSearch variant="terminal" onNavigate={() => setIsOpen(false)} />
            </li>
            <li>
              <Link
                href="/terminal"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 py-2 font-semibold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Terminal
              </Link>
            </li>
            {NAV_MENUS.map(({ label, items }) => (
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
                href="/plans"
                onClick={() => setIsOpen(false)}
                className="block text-gray-300 hover:text-yellow-400 py-2 font-medium"
              >
                Plans
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
