"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AppStoreButton from "@/components/AppStoreButton";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative w-screen overflow-hidden text-white bg-night py-16 md:py-24"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="section-glow" />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-yellow-400/60 via-amber-300/20 to-yellow-400/60 shadow-[0_0_60px_rgba(255,215,0,0.15)]">
            <div className="relative rounded-3xl bg-gradient-to-b from-[#151107] to-night px-8 py-14 md:py-16 text-center overflow-hidden">
              {/* Inner glow + grid */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.15)_0%,transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-hero-grid opacity-30 pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
                  Join Over 10,000 Investors Trading Smarter with AI
                </h2>
                <p className="text-gray-300 text-lg mb-9 max-w-2xl mx-auto">
                  Your journey to financial freedom starts here. Sign up today and
                  let AI-powered research work for you.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="btn-gold group px-8 py-3.5"
                  >
                    Register Now
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                  <Link
                    href="/plans"
                    className="btn-ghost-gold px-8 py-3.5"
                  >
                    View Plans
                  </Link>
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <AppStoreButton />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
