"use client";

import React from "react";
import { motion } from "framer-motion";
import { IBenefit } from "@/types";
import SmartAnalysisPanel from "./panels/SmartAnalysisPanel";
import AIStockResearchPanel from "./panels/AIStockResearchPanel";
import MarketDataPanel from "./panels/MarketDataPanel";

interface Props {
  benefit: IBenefit;
  imageAtRight?: boolean;
}

// Custom visual panel per benefit section (replaces the old TradingView embeds,
// whose <script> tags never execute through dangerouslySetInnerHTML)
const PANELS: Record<string, React.FC> = {
  "Smart Analysis": SmartAnalysisPanel,
  "AI Stock Research": AIStockResearchPanel,
  "Market Data": MarketDataPanel,
};

const BenefitSection: React.FC<Props> = ({ benefit, imageAtRight }) => {
  const { title, description, bullets } = benefit || {};
  const Panel = PANELS[title];

  return (
    <section
      className={`relative w-full bg-transparent ${
        imageAtRight ? "md:flex-row-reverse" : "md:flex-row"
      } flex flex-col items-center justify-between gap-16 px-6 md:px-12 py-10`}
    >
      {/* ✅ Left Text */}
      <motion.div
        initial={{ opacity: 0, x: imageAtRight ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 space-y-6 text-left"
      >
        <h3 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
          {title}
        </h3>
        <p className="text-gray-400 text-lg leading-relaxed">{description}</p>

        <ul className="space-y-4">
          {bullets?.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-400 text-md">
              <span className="mt-1.5 flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/15 border border-yellow-400/40 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
              </span>
              <span>
                <strong className="text-gray-100">{b.title}:</strong>{" "}
                {b.description}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ✅ Right Visual Panel */}
      <motion.div
        initial={{ opacity: 0, x: imageAtRight ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 w-full max-w-xl overflow-hidden rounded-2xl
        border border-white/10 bg-white/[0.02]
        shadow-[0_0_40px_rgba(255,215,0,0.12),0_25px_50px_rgba(0,0,0,0.5)]"
      >
        {Panel ? <Panel /> : null}
      </motion.div>
    </section>
  );
};

export default BenefitSection;
