"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
      { title: "WSS Newsroom", href: "/newsroom" },
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
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close overlays on navigation
  useEffect(() => {
    setIsOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Lock page scroll while the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSubmenu = (label: string) =>
    setOpenMobileMenu(openMobileMenu === label ? null : label);

  const userName = session?.user?.email?.split("@")[0] || "User";
  const displayName =
    userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  // Inline search fits when logged out; logged-in users get the icon toggle
  const showInlineSearch = !session;
  const onTerminal = pathname?.startsWith("/terminal");
  const onPlans = pathname === "/plans";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full bg-night/90 backdrop-blur-xl border-b transition-[border-color,box-shadow] duration-300 ${
        isScrolled ? "border-white/10 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]" : "border-white/5"
      }`}
    >
      {/* Fixed 64px bar; layout <main> carries the matching pt-16 */}
      <Container className="h-16 flex items-center">
        <nav className="w-full flex items-center text-white gap-3" aria-label="Primary">
          <Link
            href="/"
            className="flex items-center gap-2.5 group flex-shrink-0 -ml-1"
            aria-label="WallStreetStocks home"
          >
            <span className="w-2 h-2 rounded-full bg-gold group-hover:scale-125 transition-transform duration-300" />
            <span className="font-display text-xl text-ivory tracking-tight whitespace-nowrap">
              WallStreetStocks
            </span>
          </Link>

          {/* Inline symbol search (desktop, logged out) */}
          {showInlineSearch && (
            <div className="hidden xl:block w-[230px] ml-3 flex-shrink-0">
              <SymbolSearch variant="header" />
            </div>
          )}

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-6 ml-auto relative z-50">
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Search symbols"
              aria-expanded={searchOpen}
              className={`${showInlineSearch ? "xl:hidden" : ""} flex items-center justify-center w-9 h-9 rounded-full border transition-all flex-shrink-0 ${
                searchOpen
                  ? "bg-gold text-night border-gold"
                  : "bg-white/[0.05] border-white/10 text-gray-300 hover:text-gold hover:border-gold/50"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <Link
              href="/terminal"
              className={`flex items-center gap-2 font-monodata text-[13px] font-semibold uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                onTerminal ? "text-gold-soft" : "text-gold hover:text-gold-soft"
              }`}
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Terminal
            </Link>

            {NAV_MENUS.map((menu) => (
              <DropdownMenu key={menu.label} label={menu.label} items={menu.items} />
            ))}

            <Link
              href="/plans"
              className={`text-[15px] font-medium transition-colors duration-200 ${
                onPlans ? "text-gold" : "text-gray-300 hover:text-ivory"
              }`}
            >
              Plans
            </Link>

            {session ? (
              <>
                <Link href="/dashboard" className="btn-gold px-5 py-2 text-sm whitespace-nowrap">
                  {displayName}&apos;s Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="btn-ghost-gold px-5 py-2 text-sm whitespace-nowrap"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-gold px-5 py-2 text-sm">
                Log in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden ml-auto">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              className="bg-gold text-night rounded-full w-10 h-10 flex items-center justify-center transition-transform active:scale-95"
            >
              {isOpen ? <HiOutlineXMark className="h-5 w-5" /> : <HiBars3 className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </Container>

      {/* Expanding search panel (desktop) */}
      {searchOpen && (
        <div
          className="hidden md:block absolute left-0 right-0 top-full bg-night/[0.97] backdrop-blur-xl border-b border-white/10 py-5 shadow-2xl"
          onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
        >
          <Container>
            <div className="max-w-xl mx-auto">
              <SymbolSearch variant="terminal" autoFocus onNavigate={() => setSearchOpen(false)} />
              <p className="mt-2.5 text-center text-xs text-gray-500">
                Search any stock, ETF, index, or crypto — opens in the Terminal
              </p>
            </div>
          </Container>
        </div>
      )}

      {/* Mobile sheet */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 -translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-2"
      >
        <div className="md:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-night/[0.98] border-t border-white/10 text-white">
          <div className="px-6 py-5">
            <SymbolSearch variant="terminal" onNavigate={() => setIsOpen(false)} />
          </div>

          <ul className="px-6 pb-10 divide-y divide-white/10 border-t border-white/10">
            <li>
              <Link
                href="/terminal"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 py-4 font-monodata text-sm font-semibold uppercase tracking-wider text-gold"
              >
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Terminal
              </Link>
            </li>

            {NAV_MENUS.map(({ label, items }) => {
              const expanded = openMobileMenu === label;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(label)}
                    aria-expanded={expanded}
                    className={`w-full flex justify-between items-center py-4 text-left font-display text-2xl tracking-tight transition-colors ${
                      expanded ? "text-gold-soft" : "text-ivory"
                    }`}
                  >
                    {label}
                    <HiChevronDown
                      className={`w-5 h-5 transition-transform duration-300 ${expanded ? "rotate-180 text-gold" : "text-gray-500"}`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-expo ${
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <ul className="overflow-hidden">
                      {items.map((subItem) => (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            onClick={() => setIsOpen(false)}
                            className="block py-2.5 pl-4 text-[15px] text-gray-300 hover:text-gold border-l border-white/10 hover:border-gold/60 transition-colors"
                          >
                            {subItem.title}
                          </Link>
                        </li>
                      ))}
                      <li className="h-3" aria-hidden="true" />
                    </ul>
                  </div>
                </li>
              );
            })}

            <li>
              <Link
                href="/plans"
                onClick={() => setIsOpen(false)}
                className="block py-4 font-display text-2xl tracking-tight text-ivory hover:text-gold-soft transition-colors"
              >
                Plans
              </Link>
            </li>

            <li className="pt-6 flex flex-col gap-3">
              {session ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className="btn-gold w-full py-3">
                    {displayName}&apos;s Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="btn-ghost-gold w-full py-3"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/register" onClick={() => setIsOpen(false)} className="btn-gold w-full py-3">
                    Start free
                  </Link>
                  <Link href="/login" onClick={() => setIsOpen(false)} className="btn-ghost-gold w-full py-3">
                    Log in
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      </Transition>
    </header>
  );
};

export default Header;
