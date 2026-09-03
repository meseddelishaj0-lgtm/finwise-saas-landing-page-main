"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AppStoreButton from "@/components/AppStoreButton";

// The one loud moment on the page: a solid gold closing band.
// Black type on brand gold — poster, not glow.
export default function CTA() {
  return (
    <section
      id="cta"
      className="relative w-full overflow-hidden bg-gold text-night"
    >
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <Reveal>
          <p className="font-monodata text-[13px] md:text-sm tracking-wide text-night/60">
            ~/wss $ <span className="font-semibold text-night">GO</span> ⏎  last command of the session
          </p>

          <h2 className="mt-6 font-display text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-3xl">
            Take the desk <em className="italic">with</em> you.
          </h2>

          <p className="mt-6 text-lg md:text-xl text-night/70 max-w-2xl leading-relaxed">
            Create a free account and the terminal, research, and live data
            follow you — on the web and in the iOS app.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link href="/register" className="btn-night group px-8 py-3.5 text-base">
              Create free account
              <span className="arrow">→</span>
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-night border border-night/30 hover:border-night hover:bg-night/5 transition-all duration-300"
            >
              View plans
            </Link>
            <AppStoreButton />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
