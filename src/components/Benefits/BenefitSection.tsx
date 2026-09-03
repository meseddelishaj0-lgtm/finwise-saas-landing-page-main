"use client";

import React from "react";
import { IBenefit } from "@/types";
import Reveal from "@/components/ui/Reveal";
import SmartAnalysisPanel from "./panels/SmartAnalysisPanel";
import AIStockResearchPanel from "./panels/AIStockResearchPanel";
import MarketDataPanel from "./panels/MarketDataPanel";

interface Props {
  benefit: IBenefit;
  imageAtRight?: boolean;
}

// Custom visual panel per benefit section
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
      className={`relative w-full ${
        imageAtRight ? "lg:flex-row-reverse" : "lg:flex-row"
      } flex flex-col lg:items-center justify-between gap-10 lg:gap-16 py-12 md:py-16`}
    >
      {/* Copy */}
      <Reveal className="flex-1 max-w-xl">
        <h3 className="font-display text-ivory text-3xl md:text-[2.6rem] leading-[1.08] tracking-tight">{title}</h3>
        <p className="mt-5 text-gray-300 text-lg leading-relaxed">{description}</p>

        <ul className="mt-8 space-y-4">
          {bullets?.map((b, i) => (
            <li key={i} className="flex items-start gap-3.5 text-gray-400 text-[15px] md:text-base leading-relaxed">
              <span className="mt-1 flex-shrink-0 font-monodata text-gold font-semibold select-none">+</span>
              <span>
                <strong className="text-ivory font-semibold">{b.title}.</strong> {b.description}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Visual panel */}
      <Reveal delay={0.12} className="flex-1 w-full max-w-xl">
        <div className="card-night overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
          {Panel ? <Panel /> : null}
        </div>
      </Reveal>
    </section>
  );
};

export default BenefitSection;
