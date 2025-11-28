"use client";

import React from "react";
import { heroDetails } from "@/data/hero";
import Image from "next/image";

const Hero: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center min-h-screen 
      text-white overflow-hidden pt-28 md:pt-40"
    >
      {/* 🏙️ Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/nyc-skyline.jpg"
          alt="New York Skyline Background"
          fill
          priority
          className="object-cover object-center brightness-[0.55]"
        />
      </div>

      {/* 🟡 Top Fade - smooth blend with header */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-[1]" />

      {/* ✨ Hero Content */}
      <div className="relative z-[2] text-center mt-10 md:mt-16 px-6">
        <h1
          className="text-4xl md:text-6xl md:leading-tight font-extrabold max-w-3xl mx-auto 
          bg-gradient-to-r from-yellow-400 via-amber-300 via-orange-400 to-yellow-500
          bg-clip-text text-transparent animate-gradientFlow bg-[length:400%_400%]"
        >
          {heroDetails.heading}
        </h1>

        <p
          className="mt-4 text-lg md:text-xl max-w-2xl mx-auto font-medium
          bg-gradient-to-r from-gray-200 via-yellow-300 to-gray-300
          bg-clip-text text-transparent animate-subtleGradient bg-[length:300%_300%]"
        >
          Empowering a new generation of investors with real-time intelligence and precision.
        </p>
      </div>
    </section>
  );
};

export default Hero;
