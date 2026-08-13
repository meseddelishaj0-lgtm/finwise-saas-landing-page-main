"use client";

import React, { useEffect, useRef, useState } from "react";

interface CommandLineProps {
  /** The terminal mnemonic, e.g. "WEI" */
  cmd: string;
  /** Plain-language annotation typed after the return key */
  note?: string;
  className?: string;
}

/**
 * The landing page's signature device: each section opens as a command
 * typed into the WSS terminal. Types on first scroll into view; renders
 * the finished line for prefers-reduced-motion users.
 */
const CommandLine: React.FC<CommandLineProps> = ({ cmd, note, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [chars, setChars] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(cmd.length);
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { rootMargin: "-60px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cmd.length]);

  useEffect(() => {
    if (!started || chars >= cmd.length) return;
    const t = setTimeout(() => setChars((c) => c + 1), 110);
    return () => clearTimeout(t);
  }, [started, chars, cmd.length]);

  const done = chars >= cmd.length;

  return (
    <div
      ref={ref}
      className={`font-monodata text-[13px] md:text-sm tracking-wide ${className}`}
      aria-label={`${cmd} — ${note ?? ""}`}
    >
      <span className="text-gray-500 select-none">~/wss $</span>{" "}
      <span className="text-gold font-semibold">{cmd.slice(0, chars)}</span>
      {!done && <span className="cmd-cursor" aria-hidden="true" />}
      {done && (
        <>
          <span className="text-gray-500"> ⏎</span>
          {note && <span className="text-gray-500">{"  "}{note}</span>}
          <span className="cmd-cursor" aria-hidden="true" />
        </>
      )}
    </div>
  );
};

export default CommandLine;
