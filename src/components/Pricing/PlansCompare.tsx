import React from "react";
import Reveal from "@/components/ui/Reveal";
import CommandLine from "@/components/ui/CommandLine";
import { tiers } from "@/data/pricing";

type Cell = boolean | string;

// Mirrors the app's paywall tiers (wallstreetstocks-app/components/PaywallScreen.tsx).
const ROWS: [string, Cell, Cell, Cell][] = [
  ["Expert stock picks", "5", "8", "15"],
  ["Ad-free experience", true, true, true],
  ["Community access", true, true, true],
  ["Daily market summary", true, true, true],
  ["Watchlists", "Basic", "Unlimited", "Unlimited"],
  ["Screener filters & premium presets", false, true, true],
  ["Priority support", false, true, true],
  ["AI tools — Analyzer, Compare, Forecast", false, false, true],
  ["AI financial assistant", false, false, true],
  ["Insider trading data", false, false, true],
  ["Research reports & portfolio tools", false, false, true],
  ["Verified profile badge", false, false, true],
];

const FAQS = [
  {
    q: "How do I cancel?",
    a: "Open your dashboard and choose Manage billing — you can cancel, switch plans, or update your card there. You keep access until the end of the period you've paid for.",
  },
  {
    q: "What's the difference between monthly and yearly?",
    a: "Same features. Yearly is billed once a year and works out 33% cheaper than paying monthly.",
  },
  {
    q: "Can I upgrade or downgrade later?",
    a: "Yes — switch plans any time from Manage billing on your dashboard.",
  },
  {
    q: "Do you offer refunds?",
    a: "Subscriptions are generally non-refundable, but we review requests case by case — email wallstreetstocks@outlook.com.",
  },
  {
    q: "How is payment handled?",
    a: "Checkout runs through Stripe. Your card details go straight to Stripe — we never see or store them.",
  },
];

const Mark: React.FC<{ v: Cell; gold?: boolean }> = ({ v, gold }) => {
  if (v === true)
    return (
      <span className={`font-monodata font-semibold ${gold ? "text-gold" : "text-gold/80"}`} aria-label="Included">
        +
      </span>
    );
  if (v === false)
    return (
      <span className="text-gray-700" aria-label="Not included">
        —
      </span>
    );
  return <span className="font-monodata tabular-nums text-ivory">{v}</span>;
};

const PlansCompare: React.FC = () => (
  <>
    <section className="mt-20">
      <Reveal>
        <CommandLine cmd="CMP" note="compare plans" className="mb-4" />
        <h2 className="font-display text-ivory text-3xl md:text-4xl tracking-tight">
          Every feature, side by side.
        </h2>
      </Reveal>

      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-surface">
              <th className="sticky left-0 bg-surface text-left py-4 px-4 font-monodata text-[11px] uppercase tracking-widest text-gray-500 font-medium">
                Feature
              </th>
              {tiers.map((t) => (
                <th key={t.name} className="py-4 px-4 text-center">
                  <span className="block font-monodata text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    {t.name}
                  </span>
                  <span className="block mt-1 font-monodata text-[11px] text-gray-400 tabular-nums">
                    ${t.price}/mo · ${t.yearlyPrice}/yr
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, ...cells]) => (
              <tr key={label} className="border-b border-white/5 last:border-0">
                <td className="sticky left-0 bg-night py-3.5 px-4 text-gray-300">{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className={`py-3.5 px-4 text-center ${i === 2 ? "bg-gold/[0.03]" : ""}`}>
                    <Mark v={c} gold={i === 2} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="mt-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10">
      <div>
        <CommandLine cmd="BIL" note="billing questions" className="mb-4" />
        <h2 className="font-display text-ivory text-3xl md:text-4xl tracking-tight">
          Billing, <em className="italic text-gold-soft">plainly</em>.
        </h2>
        <p className="mt-4 text-gray-400">
          Anything else — email{" "}
          <a
            href="mailto:wallstreetstocks@outlook.com"
            className="text-gold hover:text-gold-soft underline underline-offset-4"
          >
            wallstreetstocks@outlook.com
          </a>
          .
        </p>
      </div>
      <div className="border-t border-white/10">
        {FAQS.map((f) => (
          <details key={f.q} className="group border-b border-white/10">
            <summary className="flex justify-between items-center gap-6 cursor-pointer list-none min-h-[56px] py-4 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg md:text-xl text-ivory group-hover:text-gold-soft transition-colors">
                {f.q}
              </span>
              <span className="font-monodata text-gold text-lg select-none group-open:rotate-45 transition-transform duration-300">
                +
              </span>
            </summary>
            <p className="pb-5 pr-10 text-gray-300 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  </>
);

export default PlansCompare;
