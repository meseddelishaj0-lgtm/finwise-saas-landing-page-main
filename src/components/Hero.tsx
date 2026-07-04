"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { heroDetails } from "@/data/hero";
import AppStoreButton from "@/components/AppStoreButton";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const floatingCards = [
  {
    ticker: "NVDA",
    label: "AI Rating",
    value: "Strong Buy",
    change: "+2.41%",
    className: "left-[6%] top-[30%] hidden lg:flex",
    delay: 0,
  },
  {
    ticker: "AAPL",
    label: "Momentum",
    value: "Bullish",
    change: "+1.12%",
    className: "right-[7%] top-[26%] hidden lg:flex",
    delay: 1.6,
  },
  {
    ticker: "S&P 500",
    label: "AI Forecast",
    value: "Uptrend",
    change: "+0.87%",
    className: "right-[12%] bottom-[18%] hidden xl:flex",
    delay: 0.8,
  },
];

const Hero: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden pt-28 md:pt-32"
    >
      {/* 🏙️ Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/nyc-skyline.jpg"
          alt="New York Skyline Background"
          fill
          priority
          className="object-cover object-center brightness-[0.35]"
        />
      </div>

      {/* 🕸️ Subtle grid overlay */}
      <div className="absolute inset-0 z-[1] bg-hero-grid opacity-40" />

      {/* 🌟 Gold ambient orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-yellow-400/10 rounded-full blur-[140px] z-[1] pointer-events-none" />
      <div className="absolute bottom-0 left-[10%] w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[120px] z-[1] pointer-events-none" />

      {/* Top + bottom fades */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent z-[2]" />

      {/* 💳 Floating AI insight cards */}
      {floatingCards.map((card) => (
        <motion.div
          key={card.ticker}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -12, 0] }}
          transition={{
            opacity: { delay: 1 + card.delay * 0.3, duration: 0.8 },
            y: {
              delay: card.delay,
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className={`absolute z-[3] ${card.className} flex-col gap-1 px-5 py-4 rounded-2xl
          bg-white/[0.04] backdrop-blur-md border border-white/10
          shadow-[0_8px_32px_rgba(0,0,0,0.5)]`}
        >
          <div className="flex items-center justify-between gap-6">
            <span className="font-bold text-white text-sm tracking-wide">
              {card.ticker}
            </span>
            <span className="text-emerald-400 text-xs font-semibold">
              {card.change}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">
              {card.label}
            </span>
            <span className="text-yellow-300 text-xs font-semibold">
              {card.value}
            </span>
          </div>
          <div className="mt-1 h-[3px] w-full rounded-full bg-gradient-to-r from-yellow-400/80 via-amber-300/40 to-transparent" />
        </motion.div>
      ))}

      {/* ✨ Hero Content */}
      <div className="relative z-[4] text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full
          bg-yellow-400/10 border border-yellow-400/30 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
          </span>
          <span className="text-yellow-300 text-sm font-medium tracking-wide">
            AI-Powered Market Intelligence — Live
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl md:text-6xl lg:text-7xl md:leading-[1.1] font-extrabold tracking-tight
          bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500
          bg-clip-text text-transparent animate-gradientFlow bg-[length:400%_400%]
          drop-shadow-[0_0_45px_rgba(255,215,0,0.25)]"
        >
          {heroDetails.heading}
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-300 leading-relaxed"
        >
          {heroDetails.subheading}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full
            bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-bold text-base
            shadow-[0_0_30px_rgba(255,215,0,0.35)] hover:shadow-[0_0_50px_rgba(255,215,0,0.6)]
            hover:scale-[1.04] transition-all duration-300"
          >
            Get Started Free
            <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/ai-stock-picks"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full
            bg-white/[0.05] backdrop-blur-md border border-white/15 text-white font-semibold text-base
            hover:border-yellow-400/50 hover:bg-white/[0.08] transition-all duration-300"
          >
            Explore AI Stock Picks
          </Link>
        </motion.div>

        {/* App Store download */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 flex items-center justify-center"
        >
          <AppStoreButton />
        </motion.div>

        {/* Trust stats */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm"
        >
          {[
            ["10,000+", "Active Investors"],
            ["200+", "Hedge Funds & RIAs"],
            ["24/7", "AI Market Coverage"],
          ].map(([value, label]) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-yellow-400 font-extrabold text-xl md:text-2xl">
                {value}
              </span>
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ⌄ Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[4]"
      >
        <div className="w-6 h-10 rounded-full border-2 border-yellow-400/40 flex items-start justify-center p-1.5">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-yellow-400"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
