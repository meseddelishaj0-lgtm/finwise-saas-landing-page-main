"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { Transition } from "@headlessui/react";
import { HiOutlineXMark, HiBars3 } from "react-icons/hi2";
import { useSession, signOut } from "next-auth/react";
import Container from "./Container";
import { siteDetails } from "@/data/siteDetails";
import { menuItems } from "@/data/menuItems";

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const toggleMenu = () => setIsOpen(!isOpen);

  // ✅ Extract first part of email or username
  const userName = session?.user?.email?.split("@")[0] || "User";
  const displayName =
    userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-sm">
      <Container className="!px-0">
        <nav className="flex justify-between items-center py-3 px-5 md:py-6">
          {/* ✅ Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="WallStreetStocks Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
            <span className="text-xl font-bold text-gray-900">
              WallStreetStocks
            </span>
          </Link>

          {/* ✅ Desktop Menu */}
          <ul className="hidden md:flex space-x-6 items-center">
            {menuItems
              .filter((item) => item.text !== "Login")
              .map((item) => (
                <li key={item.text}>
                  <Link
                    href={item.url}
                    className="text-gray-800 hover:text-yellow-500 transition-colors"
                  >
                    {item.text}
                  </Link>
                </li>
              ))}

            {/* ✅ Show Dashboard when logged in */}
            {session ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-black bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-full transition-all"
                  >
                    {displayName}'s Dashboard
                  </Link>
                </li>

                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-black bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-full transition-all"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="text-black bg-yellow-400 hover:bg-yellow-500 px-8 py-3 rounded-full transition-all"
                >
                  Login
                </Link>
              </li>
            )}
          </ul>

          {/* ✅ Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              type="button"
              className="bg-yellow-400 text-black rounded-full w-10 h-10 flex items-center justify-center focus:outline-none"
            >
              {isOpen ? (
                <HiOutlineXMark className="h-6 w-6" />
              ) : (
                <HiBars3 className="h-6 w-6" />
              )}
              <span className="sr-only">Toggle navigation</span>
            </button>
          </div>
        </nav>
      </Container>

      {/* ✅ Mobile Menu */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-100 transform"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div id="mobile-menu" className="md:hidden bg-white shadow-lg">
          <ul className="flex flex-col space-y-4 pt-4 pb-6 px-6">
            {menuItems
              .filter((item) => item.text !== "Login")
              .map((item) => (
                <li key={item.text}>
                  <Link
                    href={item.url}
                    className="text-gray-800 hover:text-yellow-500 block"
                    onClick={toggleMenu}
                  >
                    {item.text}
                  </Link>
                </li>
              ))}

            {session ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    onClick={toggleMenu}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-full block text-center"
                  >
                    {displayName}'s Dashboard
                  </Link>
                </li>

                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-full"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-full block text-center"
                  onClick={toggleMenu}
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
