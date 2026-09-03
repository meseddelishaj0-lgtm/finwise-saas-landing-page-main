"use client";

import React, { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Seconds to wait after the element enters view */
  delay?: number;
  className?: string;
  /** Render as a different element (default div) */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Scroll-triggered entrance. Progressive by design: the markup is visible in
 * plain HTML, the `js` class on <html> (set inline in layout.tsx) turns on the
 * hidden start state, and an IntersectionObserver adds `is-in` once the block
 * scrolls into view. Reduced-motion users get the finished state immediately
 * (handled in globals.css).
 */
const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className = "", as = "div" }) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    io.observe(el);
    // Safety net: never leave content hidden if the observer misses (e.g. an
    // element already scrolled past during a fast jump).
    const t = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) setShown(true);
    }, 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
