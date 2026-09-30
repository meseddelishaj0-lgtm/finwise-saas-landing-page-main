"use client";

import React, { useEffect, useState } from "react";

// World clocks + US session state (pre / regular / after-hours / closed).
// Holidays are not modelled.

const ZONES = [
  { label: "NY", tz: "America/New_York" },
  { label: "LDN", tz: "Europe/London" },
  { label: "FRA", tz: "Europe/Berlin" },
  { label: "TKY", tz: "Asia/Tokyo" },
  { label: "HK", tz: "Asia/Hong_Kong" },
];

const usSession = (now: Date) => {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const d = et.getDay();
  const m = et.getHours() * 60 + et.getMinutes();
  if (d === 0 || d === 6) return { label: "Closed", cls: "text-gray-500", dot: "bg-gray-500" };
  if (m >= 570 && m < 960) return { label: "Market open", cls: "text-green-400", dot: "bg-green-400 animate-pulse" };
  if (m >= 240 && m < 570) return { label: "Pre-market", cls: "text-yellow-300", dot: "bg-yellow-400" };
  if (m >= 960 && m < 1200) return { label: "After hours", cls: "text-yellow-300", dot: "bg-yellow-400" };
  return { label: "Closed", cls: "text-gray-500", dot: "bg-gray-500" };
};

const MarketClock: React.FC = () => {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const s = usSession(now);
  return (
    <div className="flex items-center gap-4 font-mono text-[11px]">
      <span className={`flex items-center gap-1.5 font-bold ${s.cls}`}>
        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
        {s.label}
      </span>
      <span className="hidden lg:flex items-center gap-3 text-gray-500">
        {ZONES.map((z) => (
          <span key={z.label}>
            {z.label}{" "}
            <span className="text-gray-300">
              {now.toLocaleTimeString("en-GB", { timeZone: z.tz, hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
};

export default MarketClock;
