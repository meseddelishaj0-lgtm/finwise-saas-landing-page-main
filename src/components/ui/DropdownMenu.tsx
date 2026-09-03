"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  title: string;
  href: string;
}

interface DropdownProps {
  label: string;
  items: DropdownItem[];
  /** Kept for backwards compatibility; the menu is always on the night bar now. */
  textColor?: string;
}

export default function DropdownMenu({ label, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const panelId = useId();

  const twoColumns = items.length > 8;
  const groupActive = items.some((i) => pathname === i.href || pathname?.startsWith(i.href + "/"));

  // Close on outside click, Escape, and navigation
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setOpen(true);
        }}
        className={`group flex items-center gap-1 py-2 text-[15px] font-medium transition-colors duration-200 ${
          open || groupActive ? "text-gold" : "text-gray-300 hover:text-ivory"
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`mt-0.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Hover bridge so the pointer can travel to the panel */}
      <div className="absolute left-0 right-0 top-full h-4" aria-hidden="true" />

      <div
        id={panelId}
        className={`absolute left-1/2 top-full z-[60] mt-3 -translate-x-1/2 rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-200 ease-expo ${
          twoColumns ? "w-[32rem] grid grid-cols-2 gap-x-1" : "w-60"
        } ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0 pointer-events-none"}`}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-[15px] transition-colors ${
                active
                  ? "text-gold bg-gold/10"
                  : "text-gray-300 hover:text-ivory hover:bg-white/[0.05]"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
