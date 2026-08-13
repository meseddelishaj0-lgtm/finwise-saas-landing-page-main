"use client";

import React from "react";
import BenefitSection from "./BenefitSection";
import benefits from "@/data/benefits";
import CommandLine from "@/components/ui/CommandLine";

const Benefits: React.FC = () => {
  return (
    <section
      id="benefits"
      className="relative w-screen overflow-hidden text-white bg-night border-t border-white/10"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      {/* ✅ Main content container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Section Heading */}
        <div className="mb-16 md:mb-20">
          <CommandLine cmd="DES" note="what the desk does" className="mb-4" />
          <h2 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Research that reads the market <em className="italic text-gold-soft">with</em> you.
          </h2>
        </div>

        {/* ✅ Benefit sections — seamless merge (no vertical space) */}
        <div className="flex flex-col m-0 p-0">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`m-0 p-0 ${
                index !== benefits.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <BenefitSection
                benefit={benefit}
                imageAtRight={index % 2 === 1}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
