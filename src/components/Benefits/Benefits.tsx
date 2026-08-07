"use client";

import React from "react";
import BenefitSection from "./BenefitSection";
import benefits from "@/data/benefits";

const Benefits: React.FC = () => {
  return (
    <section
      id="benefits"
      className="relative w-screen overflow-hidden text-white bg-night"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="section-glow" />

      {/* ✅ Main content container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Section Heading */}
        <div className="text-center mb-20">
          <span className="badge-pill mb-5">
            Why WallStreetStocks
          </span>
          <h2
            className="text-5xl md:text-6xl font-extrabold tracking-tight
            bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent
            drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]"
          >
            Platform Benefits
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
