"use client";

import React from "react";
import BenefitSection from "./BenefitSection";
import benefits from "@/data/benefits";

const Benefits: React.FC = () => {
  return (
    <section
      id="benefits"
      className="relative w-screen overflow-hidden text-white bg-fixed"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      {/* ✅ Full-width radiant background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1000]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.15)_0%,rgba(0,0,0,1)_85%)] opacity-70" />
      </div>

      {/* ✅ Main content container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Section Heading */}
        <h2
          className="text-5xl md:text-6xl font-extrabold text-center mb-20 
          bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent 
          drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]"
        >
          Platform Benefits
        </h2>

        {/* ✅ Benefit sections — seamless merge (no vertical space) */}
        <div className="flex flex-col m-0 p-0">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`m-0 p-0 ${
                index !== benefits.length - 1 ? "border-b border-[#1a1a1a]" : ""
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

      {/* ✅ Bottom fade to black for smooth transition */}
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
};

export default Benefits;
