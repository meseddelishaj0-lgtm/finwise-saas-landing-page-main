"use client";

import React from "react";
import { motion } from "framer-motion";

const AboutPage = () => {
  return (
    <main className="bg-hero-background text-foreground min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-5xl text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold manrope mb-6">
          About <span className="text-primary">WallStreetStocks.ai</span>
        </h1>

        <p className="text-lg text-foreground-accent leading-relaxed mb-8">
          WallStreetStocks.ai is redefining how investors analyze the markets.
          Built on advanced AI and real-time data, our platform delivers deep
          financial insights, portfolio intelligence, and predictive analytics —
          helping investors make smarter, faster, and more confident decisions.
        </p>

        <p className="text-lg text-foreground-accent leading-relaxed mb-8">
          Whether you’re a retail investor, financial advisor, or hedge fund,
          WallStreetStocks.ai gives you institutional-grade tools that uncover
          opportunities before the market does. Our system continuously scans
          thousands of equities, bonds, ETFs, and macro indicators to reveal
          valuation trends, sentiment shifts, and risk signals in seconds.
        </p>

        <h2 className="text-3xl font-semibold mt-12 mb-4">Our Mission</h2>
        <p className="text-lg text-foreground-accent leading-relaxed mb-8">
          Our mission is simple: to democratize institutional-level market
          intelligence and make advanced investing tools accessible to everyone.
          We believe every investor deserves data-driven clarity — not noise.
        </p>

        <h2 className="text-3xl font-semibold mt-12 mb-4">The Technology</h2>
        <p className="text-lg text-foreground-accent leading-relaxed mb-8">
          Powered by AI forecasting engines, sentiment models, and data from
          industry-leading sources, our platform
          transforms complex financial data into clear, actionable insights.
          From equity fundamentals and bond analytics to AI-driven macro
          forecasting — everything is built for precision and performance.
        </p>

        <h2 className="text-3xl font-semibold mt-12 mb-4">Join the Future of Investing</h2>
        <p className="text-lg text-foreground-accent leading-relaxed">
          WallStreetStocks.ai is trusted by thousands of investors, advisors,
          and professionals across the world. Whether you’re just starting or
          managing millions, our platform gives you the competitive edge to stay
          ahead of the market.  
          <br />
          <br />
          <strong>Welcome to the future of AI-powered investing.</strong>
        </p>
      </motion.div>
    </main>
  );
};

export default AboutPage;
