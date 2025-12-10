"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  title: string;
  href: string;
}

interface DropdownProps {
  label: string;
  items: DropdownItem[];
  textColor?: string; // Optional custom text color
}

export default function DropdownMenu({
  label,
  items,
  textColor = "text-white", // default for your black header
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // ✅ Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timer.current = setTimeout(() => setOpen(false), 300); // smooth delay
  };

  // Detect dark mode (white text)
  const isWhite = textColor.includes("white");

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 🔽 Trigger Button */}
      <button
        className={`flex items-center gap-1 font-medium transition-all duration-200 ${
          open
            ? "text-yellow-400"
            : `${textColor} hover:text-yellow-400`
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`mt-0.5 transition-transform ${
            open ? "rotate-180 text-yellow-400" : "text-inherit"
          }`}
        />
      </button>

      {/* 🟨 Invisible hover bridge to prevent flicker */}
      <div
        className="absolute left-0 right-0 h-3 bg-transparent z-[9998]"
        style={{ top: "100%" }}
      ></div>

      {/* 🧭 Dropdown Container */}
      <div
        className={`absolute left-0 mt-1 w-56 rounded-xl shadow-xl z-[9999] p-2 transition-all duration-200 ease-out border ${
          open
            ? "opacity-100 translate-y-0 visible"
            : "opacity-0 -translate-y-2 invisible pointer-events-none"
        } ${
          isWhite
            ? "bg-[#0b0b0f]/95 border-gray-800"
            : "bg-white border-gray-100"
        }`}
        style={{
          pointerEvents: open ? "auto" : "none",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`block px-3 py-2 text-sm rounded-lg transition-all ${
              isWhite
                ? "text-gray-300 hover:text-yellow-400 hover:bg-gray-800/60"
                : "text-gray-700 hover:bg-gray-100 hover:text-yellow-500"
            }`}
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
