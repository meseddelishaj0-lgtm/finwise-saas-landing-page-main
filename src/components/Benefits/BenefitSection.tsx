"use client";

import React from "react";
import { IBenefit } from "@/types";

interface Props {
  benefit: IBenefit;
  imageAtRight?: boolean;
}

const BenefitSection: React.FC<Props> = ({ benefit, imageAtRight }) => {
  const { title, description, bullets } = benefit || {};
  const widget = (benefit as any)?.widget || "";

  return (
    <section
      className={`relative w-full bg-transparent ${
        imageAtRight ? "md:flex-row-reverse" : "md:flex-row"
      } flex flex-col items-center justify-between gap-16 px-6 md:px-12`}
    >
      {/* ✅ Left Text */}
      <div className="flex-1 space-y-6 text-left">
        <h3 className="text-4xl md:text-5xl font-bold text-yellow-400">
          {title}
        </h3>
        <p className="text-gray-300 text-lg leading-relaxed">
          {description}
        </p>

        <ul className="space-y-3">
          {bullets?.map((b, i) => (
            <li key={i} className="text-gray-400 text-md">
              <strong className="text-yellow-400">{b.title}:</strong>{" "}
              {b.description}
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ Right Widget */}
      <div
        className="flex-1 w-full h-[650px] md:h-[700px] overflow-hidden rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.15)]"
        dangerouslySetInnerHTML={{ __html: widget || "" }}
      />
    </section>
  );
};

export default BenefitSection;
