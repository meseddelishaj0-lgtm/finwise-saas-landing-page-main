"use client";

import Link from "next/link";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] py-10 md:py-14 -mt-10"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      {/* Gold glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.12)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center px-6 -mt-6">
        <h2 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-4">
          Join Over 10,000 Users To Transform Your Finances
        </h2>
        <p className="text-gray-300 text-lg mb-8">
          Your journey to financial freedom starts here. Sign Up today and take
          the first step towards a brighter financial future!
        </p>

        <Link
          href="/register"
          className="inline-block bg-yellow-400 text-black font-semibold px-8 py-3 rounded-xl shadow-[0_0_25px_rgba(255,215,0,0.4)] hover:shadow-[0_0_35px_rgba(255,215,0,0.6)] hover:scale-105 transition-all duration-300"
        >
          Register Now
        </Link>
      </div>
    </section>
  );
}
